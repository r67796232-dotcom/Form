const SUPABASE_URL = "https://mcfgqitnsndyhfwobiee.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_eTGqwM8Pwacy62eYUCJUGQ_iSlp8p_M";
const form = document.querySelector("#enrollment-form");
const message = document.querySelector("#form-message");
const submitButton = form.querySelector('button[type="submit"]');
const honeypot = form.querySelector('[name="contactWebsite"]');

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  if (honeypot.value.trim()) {
    showMessage("We could not verify this submission. Please refresh the page and try again.", false);
    return;
  }

  const formData = new FormData(form);
  const enquiry = {
    student_name: formData.get("studentName").trim(),
    birth_date: formData.get("birthDate"),
    guardian_name: formData.get("guardianName").trim(),
    phone: formData.get("phone").trim(),
    email: formData.get("email").trim(),
    school: formData.get("school").trim() || null,
    address: formData.get("address").trim() || null,
    class_name: formData.get("class"),
    board: formData.get("board"),
    subjects: formData.get("subjects"),
    learning_mode: formData.get("learningMode"),
    start_date: formData.get("startDate") || null,
    schedule: formData.get("schedule") || null,
    notes: formData.get("notes").trim() || null,
    consent: formData.get("consent") === "on",
  };

  submitButton.disabled = true;
  message.classList.remove("visible");

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/enquiries`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(enquiry),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = errorBody;
      let errorCode = "";
      try {
        const errorDetails = JSON.parse(errorBody);
        errorCode = errorDetails.code || "";
        errorMessage = errorDetails.message || errorDetails.details || errorBody;
      } catch {
        // Keep the response text when Supabase does not return JSON.
      }

      console.error("Supabase enquiry insert failed:", response.status, errorMessage);
      if (errorCode === "42501" || response.status === 403) {
        throw new Error("Supabase denied the insert. Run the setup SQL to grant insert access and enable the enquiries policy.");
      }
      if (response.status === 401) {
        throw new Error("Supabase rejected the public key. Check the project URL and publishable key.");
      }
      if (response.status === 404) {
        throw new Error("The enquiries table was not found. Run the Supabase setup SQL in the project.");
      }
      throw new Error(`Supabase could not save the enquiry: ${errorMessage || response.statusText}`);
    }

    form.reset();
    showMessage("Thank you. Your enquiry has been submitted successfully.", true);
  } catch (error) {
    console.error("Could not submit enrolment enquiry:", error);
    showMessage(
      error instanceof TypeError
        ? "Could not connect to Supabase. Check your internet connection and project settings, then try again."
        : error.message,
      false,
    );
  } finally {
    submitButton.disabled = false;
  }
});

function showMessage(text, success) {
  message.textContent = text;
  message.classList.add("visible");
  message.setAttribute("role", success ? "status" : "alert");
}
