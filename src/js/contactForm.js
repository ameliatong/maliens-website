export function initContactForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("contactStatus");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = form.querySelector("button[type='submit']");
    const formData = new FormData(form);

    const token = formData.get("cf-turnstile-response");

    if (!token) {
      status.textContent = "Please verify that you're human.";
      return;
    }

    const payload = {
      name: formData.get("name")?.trim(),
      email: formData.get("email")?.trim(),
      message: formData.get("message")?.trim(),
      turnstileToken: token,
    };

    try {
      submitButton.disabled = true;
      status.textContent = "Sending...";

      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Something went wrong.");
      }

      status.textContent = "Message sent. We’ll get back to you soon.";
      form.reset();

      if (window.turnstile) {
        window.turnstile.reset();
      }
    } catch (error) {
      status.textContent = error.message || "Failed to send message.";
    } finally {
      submitButton.disabled = false;
    }
  });
}
