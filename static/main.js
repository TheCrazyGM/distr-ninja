// Generate current UTC datetime in ISO 8601 format with milliseconds and 'Z'
function getCurrentUTCDateTime() {
  const now = new Date();
  // toISOString() returns format like 2025-05-19T12:54:25.218Z
  return now.toISOString();
}

function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toast-container");
  const toastId = `toast-${Date.now()}`;
  const toastHTML = `
          <div id="${toastId}" class="toast align-items-center text-white bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
              <div class="toast-body">
                ${message}
              </div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
          </div>
        `;
  toastContainer.insertAdjacentHTML("beforeend", toastHTML);
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement);
  toast.show();
  toastElement.addEventListener("hidden.bs.toast", () => {
    toastElement.remove();
  });
}

function showLoginForm() {
  document.getElementById("login-area").innerHTML = `
                <form class="d-flex align-items-center" id="loginForm" autocomplete="off">
                    <input type="text" class="form-control me-2" id="username" placeholder="Hive username" autocomplete="username" style="width: 180px;">
                    <button class="btn btn-primary me-2" id="loginBtn" type="submit">Login & Sign</button>
                </form>
            `;
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    loginAndFetchClaims();
  });
}

function showUserNav(username) {
  document.getElementById("login-area").innerHTML = `
                <span class="me-3"><i class="fa-solid fa-user"></i> <b>${username}</b></span>
                <button class="btn btn-outline-secondary btn-sm" id="logoutBtn">Logout</button>
            `;
  document.getElementById("logoutBtn").onclick = logout;
}

function loginAndFetchClaims() {
  const datetimeToSign = getCurrentUTCDateTime();
  const username = document.getElementById("username").value.trim();
  const status = document.getElementById("status");

  if (!username) {
    showToast("Please enter your Hive username.", "danger");
    return;
  }

  if (typeof window.hive_keychain === "undefined") {
    showToast("Hive Keychain extension not detected!", "danger");
    return;
  }

  // Request to sign the memo (datetime string) with the user's memo key
  window.hive_keychain.requestSignBuffer(
    username,
    datetimeToSign, // now dynamically generated in UTC ISO format
    "Posting",
    function (response) {
      if (response.success) {
        showToast("Posting signed successfully! Sending to API...", "info");
        const proof = response.result;
        const pubkey =
          response.publicKey ||
          (response.data && response.data.publicKey) ||
          null;
        if (!pubkey) {
          showToast(
            "Could not retrieve public key from Keychain response.",
            "danger",
          );
          return;
        }
        // Prepare payload
        const payload = {
          challenge: proof, // signature as challenge
          username: username,
          pubkey: pubkey,
          proof: datetimeToSign, // datetime as proof
        };

        // Send to API
        fetch("https://beta-api.distriator.com/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
          .then((res) => res.json())
          .then((apiRes) => {
            if (apiRes.token) {
              // Save token and type to localStorage
              localStorage.setItem("distriator_token", apiRes.token);
              if (apiRes.type) {
                localStorage.setItem("distriator_type", apiRes.type);
              }
              showToast("Login successful! Token and type saved.", "success");
              showUserNav(username);
              // Fetch claims and display them
              fetchClaimsAndDisplay();
            } else {
              showToast(
                `API response: ${apiRes.message || JSON.stringify(apiRes)}`,
                "danger",
              );
            }
          })
          .catch((err) => {
            showToast(`API call failed: ${err}`, "danger");
          });
      } else {
        showToast(
          `Failed to sign posting: ${response.message || "Unknown error"}`,
          "danger",
        );
      }
    },
  );
}

// Logout function
function logout() {
  localStorage.removeItem("distriator_token");
  localStorage.removeItem("distriator_type");
  document.getElementById("claims-container").innerHTML = "";
  showToast("You have been logged out.", "info");
  showLoginForm();
}

// Helper for authenticated API requests
function distriatorFetch(url, options = {}) {
  const token = localStorage.getItem("distriator_token");
  if (!options.headers) options.headers = {};
  if (token) {
    options.headers["Authorization"] = "Bearer " + token;
  }
  return fetch(url, options);
}

// Format currency value
function formatCurrency(value) {
  if (typeof value === "string") {
    return value; // Already formatted (e.g., "1.000 HBD")
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

// Create a post form for a specific claim
function createPostForm(claim, claimId) {
  return `
        <div class="card shadow-sm mb-4" id="post-form-${claimId}">
            <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0">Create Post for Invoice: ${claim.invoice}</h5>
                <button class="btn btn-light btn-sm" onclick="toggleClaimView('${claimId}')">Back to Claim</button>
            </div>
            <div class="card-body">
                <form class="needs-validation" novalidate onsubmit="createHivePost(event, '${claimId}')">
                    <div class="mb-3">
                        <label for="postTitle-${claimId}" class="form-label">Title</label>
                        <input type="text" class="form-control" id="postTitle-${claimId}" required>
                        <div class="invalid-feedback">Please provide a title.</div>
                    </div>
                    <div class="mb-3">
                        <label for="postBody-${claimId}" class="form-label">Body</label>
                        <div class="alert alert-info mb-2">
                            <strong>Important:</strong> Your review must include at least 2 pictures of the product/service to qualify for the claim.
                            Use markdown image syntax: ![description](image_url)
                        </div>
                        <textarea class="form-control" id="postBody-${claimId}" rows="6" required></textarea>
                        <div class="invalid-feedback">Please provide content for your post.</div>
                        <div class="form-text">Write your post in Markdown format. Remember to include at least 2 images!</div>
                    </div>
                    <div class="mb-3">
                        <label for="imageUpload-${claimId}" class="form-label">Upload Image</label>
                        <div class="input-group">
                            <input type="file" class="form-control" id="imageUpload-${claimId}" accept="image/*">
                            <button class="btn btn-outline-secondary" type="button" onclick="uploadImage(document.getElementById('imageUpload-${claimId}').files[0], document.querySelector('#login-area b').textContent, window.easyMDE)">Upload</button>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Submit Post</button>
                </form>
            </div>
        </div>
        `;
}

// Create a claim card
function createClaimCard(claim, index) {
  const date = new Date(claim.timestamp);
  const formattedDate = date.toLocaleString();
  const claimId = `claim-${index}`;

  return `
        <div class="claim-container" id="${claimId}">
            <div class="claim-view">
                <div class="card shadow-sm mb-4">
                    <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 class="mb-0">Invoice: ${claim.invoice}</h5>
                        <div>
                            <span class="badge bg-light text-primary me-2">${claim.amount}</span>
                            <button class="btn btn-light btn-sm" onclick="toggleClaimView('${claimId}')">Claim</button>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Business:</strong> ${claim.business}</p>
                                <p class="mb-1"><strong>Country:</strong> ${claim.country}</p>
                                <p class="mb-1"><strong>Date:</strong> ${formattedDate}</p>
                                <p class="mb-1"><strong>Payment Method:</strong> ${claim.paymentMethod}</p>
                            </div>
                            <div class="col-md-6">
                                <p class="mb-1"><strong>Claim Value:</strong> ${claim.claimValue}</p>
                                <p class="mb-1"><strong>Percentage:</strong> ${claim.percentage}</p>
                                <p class="mb-1"><strong>Transaction Amount:</strong> ${claim.transactionAmount}</p>
                            </div>
                        </div>

                        ${claim.guides && claim.guides.length > 0
      ? `
                        <div class="mt-3">
                            <h6 class="mb-2">Guides</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Percent</th>
                                            <th>Guides Percent</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${claim.guides
        .map(
          (guide) => `
                                        <tr>
                                            <td>${guide.name}</td>
                                            <td>${guide.percent}</td>
                                            <td>${guide.guidesPercent}</td>
                                            <td>${guide.value}</td>
                                        </tr>
                                        `,
        )
        .join("")}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        `
      : ""
    }

                        ${claim.onborder
      ? `
                        <div class="mt-3">
                            <h6 class="mb-2">Onborder</h6>
                            <div class="table-responsive">
                                <table class="table table-sm">
                                    <tr>
                                        <td><strong>Name:</strong></td>
                                        <td>${claim.onborder.name}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Percent:</strong></td>
                                        <td>${claim.onborder.percent}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Value:</strong></td>
                                        <td>${claim.onborder.value}</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        `
      : ""
    }
                    </div>
                </div>
            </div>
            <div class="post-form" style="display: none;">
                ${createPostForm(claim, claimId)}
            </div>
        </div>
        `;
}

// Fetch claims and display them on the page
function fetchClaimsAndDisplay() {
  const container = document.getElementById("claims-container");
  container.innerHTML =
    '<div class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

  distriatorFetch("https://beta-api.distriator.com/claims/v2")
    .then((res) => res.json())
    .then((data) => {
      if (data.claim) {
        // Store claims data globally with index
        window._claimsData = [{ claim: data.claim, index: 0 }];
        container.innerHTML = createClaimCard(data.claim, 0);
      } else {
        container.innerHTML =
          '<div class="alert alert-info">No claims found.</div>';
      }
    })
    .catch((err) => {
      container.innerHTML = `<div class="alert alert-danger">Failed to fetch claims: ${err}</div>`;
    });
}

// Toggle between claim view and post form
function toggleClaimView(claimId) {
  const container = document.getElementById(claimId);
  const claimView = container.querySelector(".claim-view");
  const postForm = container.querySelector(".post-form");

  if (claimView.style.display !== "none") {
    claimView.style.display = "none";
    postForm.style.display = "block";
    initializeEasyMDE(`postBody-${claimId}`);
  } else {
    claimView.style.display = "block";
    postForm.style.display = "none";
  }
}

function initializeEasyMDE(textareaId) {
  const easyMDE = new EasyMDE({
    element: document.getElementById(textareaId),
    spellChecker: false,
  });
  window.easyMDE = easyMDE;
  easyMDE.codemirror.on("change", () => {
    document.getElementById(textareaId).value = easyMDE.value();
  });
}

function uploadImage(file, username, easyMDE) {
  if (!file) {
    showToast("Please select a file to upload.", "danger");
    return;
  }

  // Following the exact process described in the documentation
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      // 1. Get the raw image data as bytes
      const imageData = new Uint8Array(event.target.result);

      // 2. Create the challenge string as bytes
      const textEncoder = new TextEncoder();
      const challengeBytes = textEncoder.encode("ImageSigningChallenge");

      // 3. Concatenate challenge + image bytes
      const messageBytes = new Uint8Array(challengeBytes.length + imageData.length);
      messageBytes.set(challengeBytes, 0);
      messageBytes.set(imageData, challengeBytes.length);

      // 4. Hash the combined data using SHA-256
      // 4. Pass the full buffer as a Buffer object to Keychain (no hashing)
      const bufferObj = {
        type: "Buffer",
        data: Array.from(messageBytes)
      };

      window.hive_keychain.requestSignBuffer(
        username.toLowerCase(), // Username should be lowercase for the API
        JSON.stringify(bufferObj),
        "Posting",
        (response) => {
          if (response.success) {
            console.log("Signature result:", response.result);

            // Get the signature from response
            const signature = response.result;

            // Create form data with the image file
            const formData = new FormData();
            formData.append("file", file);

            // Upload to images.hive.blog with the signature
            fetch(`https://images.hive.blog/${username.toLowerCase()}/${signature}`, {
              method: "POST",
              body: formData,
            })
              .then((res) => {
                if (!res.ok) {
                  throw new Error(`Server returned ${res.status}: ${res.statusText}`);
                }
                return res.json();
              })
              .then((data) => {
                if (data.url) {
                  const imageUrl = data.url;
                  const markdown = `![${file.name}](${imageUrl})`;
                  const pos = easyMDE.codemirror.getCursor();
                  easyMDE.codemirror.replaceRange(markdown, pos);
                  showToast("Image uploaded successfully!", "success");
                } else {
                  console.error("Upload response:", data);
                  showToast("Failed to upload image: No URL in response", "danger");
                }
              })
              .catch((err) => {
                console.error("Upload error:", err);
                showToast(`Image upload failed: ${err.message || err}`, "danger");
              });
          } else {
            showToast(`Failed to sign image: ${response.message}`, "danger");
          }
        }
      );
    } catch (error) {
      console.error("Error preparing image for upload:", error);
      showToast(`Error preparing image: ${error.message}`, "danger");
    }
  };
  reader.onerror = () => {
    showToast("Could not read the image file", "danger");
  };
  reader.readAsArrayBuffer(file);
}

// Create and submit Hive post
function createHivePost(event, claimId) {
  event.preventDefault();
  const form = event.target;
  if (!form.checkValidity()) {
    form.classList.add("was-validated");
    return;
  }

  const title = document.getElementById(`postTitle-${claimId}`).value.trim();
  let body = document.getElementById(`postBody-${claimId}`).value.trim();
  const username = document.querySelector("#login-area b")?.textContent;

  if (!username) {
    showToast("Please login first.", "danger");
    return;
  }

  // Get the claim data from the stored claims
  const claimData = window._claimsData?.find(
    (c) => `claim-${c.index}` === claimId,
  )?.claim;
  if (!claimData) {
    showToast("No claim data available. Please refresh the page.", "danger");
    return;
  }

  // Append the template with claim data
  const template = `

---

Business name: [${claimData.business}](https://distriator.com/#/businesses/${encodeURIComponent(claimData.business.toLowerCase())})
[Open SpendHBD Business Page]()

Paid Amount: ${claimData.amount}
Rewards Claimed: ${claimData.claimValue} (${claimData.percentage} of ${claimData.amount})

To benefit from Distriator and receive discounts on your Hive Dollars purchases:

1. Spend Hive Dollars at listed businesses on Distriator (See business list here - <https://distriator.com/#/businesses>).
2. Make sure business issues a QR Invoice from v4v.app / Hive-Keychain app.
3. Go to <https://distriator.com>, log in, follow the instructions, and make your claim.
`;

  // Append template to user's body text
  body = body + template;

  const jsonMetadata = {
    app: "distriator.ninja/0.0.0",
    business_display_name: claimData.business,
    business_name: claimData.business.toLowerCase().replace(/\s+/g, "-"),
    claim_percent: claimData.percentage,
    claim_value: claimData.claimValue,
    developer: "thecrazygm",
    format: "markdown",
    guides_percent: claimData.guides?.[0]?.percent?.replace(" %", "") || "0",
    image: [], // Can be populated if needed
    invoice_id: claimData.invoice,
    invoice_memo: claimData.memo,
    spend_hbd_link: "",
    tags: ["spendhbd", "distriator", "spendtoearn"],
    team: "mithril.destiny",
    total_value: claimData.amount,
    unique_business_invoice_id: `${claimData.business.toLowerCase().replace(/\s+/g, "-")}-${claimData.invoice}`,
    users: [username],
  };

  const permlink =
    `${jsonMetadata.business_name}-${jsonMetadata.invoice_id}`.toLowerCase();
  const operations = [
    [
      "comment",
      {
        parent_author: "",
        parent_permlink: "hive-106130",
        category: "hive-106130",
        author: username,
        permlink: permlink,
        title: title,
        body: body,
        json_metadata: JSON.stringify(jsonMetadata),
      },
    ],
    [
      "comment_options",
      {
        author: username,
        permlink: permlink,
        allow_votes: true,
        allow_curation_rewards: true,
        max_accepted_payout: "100000.000 HBD",
        percent_hbd: 10000,
        extensions: [
          [
            0,
            {
              beneficiaries: [
                {
                  account: "distriator.bene",
                  weight: 6000, // 60%
                },
              ],
            },
          ],
        ],
      },
    ],
  ];

  window.hive_keychain.requestBroadcast(
    username,
    operations,
    "posting",
    (response) => {
      if (response.success) {
        showToast("Post created successfully!", "success");
        form.reset();
        form.classList.remove("was-validated");
        // Restart the workflow: reload claims so user can continue with a fresh state
        fetchClaimsAndDisplay();
      } else {
        showToast(`Failed to create post: ${response.message}`, "danger");
      }
    },
  );
}

// Check for existing token on page load
window.addEventListener("DOMContentLoaded", function () {
  const token = localStorage.getItem("distriator_token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const username = payload.username || "User";
      showUserNav(username);
      fetchClaimsAndDisplay();
    } catch (err) {
      console.error("Error parsing token:", err);
      logout(); // Invalid token, clear it
    }
  } else {
    showLoginForm();
  }
});
