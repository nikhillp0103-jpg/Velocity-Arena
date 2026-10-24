const form = document.querySelector("#authForm");
const forgotForm = document.querySelector("#forgotPasswordForm");
const resetForm = document.querySelector("#resetPasswordForm");
const nameField = document.querySelector("#nameField");
const nameInput = document.querySelector("#name");
const passwordInput = document.querySelector("#password");
const authError = document.querySelector("#authError");
const intro = document.querySelector("#authIntro");
const submitButton = document.querySelector("#submitButton");
const loginTab = document.querySelector("#loginTab");
const signupTab = document.querySelector("#signupTab");
const authTabs = document.querySelector(".auth-tabs");
const forgotPasswordLink = document.querySelector("#forgotPasswordLink");
const forgotError = document.querySelector("#forgotError");
const resetError = document.querySelector("#resetError");
const params = new URLSearchParams(location.search);
const resetToken = params.get("reset") || "";
let mode = params.get("mode") === "signup" ? "signup" : "login";

function serverHelp(status) {
  if (status === 405 || status === 404) {
    return "This page is being served by a static preview, not the app server. Double-click start.bat and open http://localhost:3000.";
  }
  return "Start the local app with start.bat, then open http://localhost:3000.";
}

async function requestJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error("Cannot reach the app server. Double-click start.bat, then open http://localhost:3000.");
  }

  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    if (response.status === 404 || response.status === 405 || /^\s*</.test(text)) {
      throw new Error(serverHelp(response.status));
    }
    throw new Error(`The app server returned an unexpected response (${response.status}). ${serverHelp(response.status)}`);
  }
  if (!text.trim()) throw new Error(`The app server returned an empty response (${response.status}). ${serverHelp(response.status)}`);

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`The app server returned invalid JSON (${response.status}). Restart it with start.bat and try again.`);
  }
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status}).`);
  return result;
}

function setMode(nextMode) {
  mode = nextMode;
  const signup = mode === "signup";
  nameField.hidden = !signup;
  nameInput.required = signup;
  passwordInput.autocomplete = signup ? "new-password" : "current-password";
  forgotPasswordLink.hidden = signup;
  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);
  loginTab.setAttribute("aria-selected", String(!signup));
  signupTab.setAttribute("aria-selected", String(signup));
  document.querySelector("#authTitle").textContent = signup ? "Create your account" : "Welcome back";
  intro.textContent = signup
    ? "One account for bookings, tickets and local tournaments."
    : "Log in to manage bookings, tickets and tournaments.";
  submitButton.textContent = signup ? "Create account" : "Log in";
  authError.hidden = true;
}

function showAuthForm() {
  form.hidden = false;
  authTabs.hidden = false;
  forgotForm.hidden = true;
  resetForm.hidden = true;
  document.querySelector("#authTitle").textContent = mode === "signup" ? "Create your account" : "Welcome back";
  intro.textContent = mode === "signup"
    ? "One account for bookings, tickets and local tournaments."
    : "Log in to manage bookings, tickets and tournaments.";
  setMode(mode);
}

function showForgotForm() {
  form.hidden = true;
  authTabs.hidden = true;
  forgotForm.hidden = false;
  resetForm.hidden = true;
  document.querySelector("#authTitle").textContent = "Reset your password";
  intro.textContent = "Enter the email used for your account. In local mode, the reset link appears in the server terminal.";
  forgotError.hidden = true;
  document.querySelector("#forgotEmail").value = document.querySelector("#email").value.trim();
}

function showResetForm() {
  form.hidden = true;
  authTabs.hidden = true;
  forgotForm.hidden = true;
  resetForm.hidden = false;
  forgotPasswordLink.hidden = true;
  document.querySelector("#authTitle").textContent = "Choose a new password";
  intro.textContent = "Reset links are single-use and expire after 15 minutes.";
}

async function submitAccount(event) {
  event.preventDefault();
  authError.hidden = true;
  submitButton.disabled = true;
  submitButton.textContent = mode === "signup" ? "Creating account…" : "Logging in…";
  try {
    await requestJson(`/api/auth/${mode === "signup" ? "register" : "login"}`, {
      name: nameInput.value.trim(),
      email: document.querySelector("#email").value.trim(),
      password: passwordInput.value
    });
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    location.assign(safeNext);
  } catch (error) {
    authError.textContent = error.message;
    authError.hidden = false;
  } finally {
    submitButton.textContent = mode === "signup" ? "Create account" : "Log in";
    submitButton.disabled = false;
  }
}

async function submitForgotPassword(event) {
  event.preventDefault();
  const button = document.querySelector("#forgotSubmit");
  forgotError.hidden = true;
  button.disabled = true;
  button.textContent = "Creating reset link…";
  try {
    const result = await requestJson("/api/auth/forgot-password", {
      email: document.querySelector("#forgotEmail").value.trim()
    });
    forgotError.classList.remove("auth-error");
    forgotError.classList.add("auth-success");
    forgotError.textContent = result.message;
    forgotError.hidden = false;
  } catch (error) {
    forgotError.classList.add("auth-error");
    forgotError.classList.remove("auth-success");
    forgotError.textContent = error.message;
    forgotError.hidden = false;
  } finally {
    button.textContent = "Create reset link";
    button.disabled = false;
  }
}

async function submitResetPassword(event) {
  event.preventDefault();
  const button = document.querySelector("#resetSubmit");
  resetError.hidden = true;
  const password = document.querySelector("#newPassword").value;
  if (password !== document.querySelector("#confirmPassword").value) {
    resetError.textContent = "The passwords do not match.";
    resetError.hidden = false;
    return;
  }
  button.disabled = true;
  button.textContent = "Updating password…";
  try {
    const result = await requestJson("/api/auth/reset-password", { token: resetToken, password });
    document.querySelector("#authTitle").textContent = "Password updated";
    intro.textContent = result.message;
    resetForm.hidden = true;
    authTabs.hidden = false;
    history.replaceState(null, "", "/auth.html");
    showAuthForm();
    authError.textContent = result.message;
    authError.hidden = false;
  } catch (error) {
    resetError.textContent = error.message;
    resetError.hidden = false;
  } finally {
    button.disabled = false;
    button.textContent = "Update password";
  }
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));
forgotPasswordLink.addEventListener("click", showForgotForm);
document.querySelector("#backToLogin").addEventListener("click", showAuthForm);
form.addEventListener("submit", submitAccount);
forgotForm.addEventListener("submit", submitForgotPassword);
resetForm.addEventListener("submit", submitResetPassword);

if (resetToken) {
  showResetForm();
} else {
  showAuthForm();
}
