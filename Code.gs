const SPREADSHEET_PROPERTY = "ENQUIRIES_SPREADSHEET_ID";
const NOTIFICATION_EMAIL_PROPERTY = "NOTIFICATION_EMAIL";
const HEADERS = [
  "Submitted at",
  "Student's full name",
  "Date of birth",
  "Parent / guardian name",
  "Mobile number",
  "Email address",
  "Current school",
  "Home address",
  "Class applying for",
  "School board",
  "Subject focus",
  "Preferred learning mode",
  "Preferred start date",
  "Preferred class time",
  "Additional notes"
];

function setup() {
  const sheet = getEnquiriesSheet();
  Logger.log("Enquiries sheet: " + sheet.getParent().getUrl());
}

function getEnquiriesSheet() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    let spreadsheetId = properties.getProperty(SPREADSHEET_PROPERTY);
    let spreadsheet;

    if (spreadsheetId) {
      spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    } else {
      spreadsheet = SpreadsheetApp.create("Rajat Learning Academy - Enquiries");
      properties.setProperty(SPREADSHEET_PROPERTY, spreadsheet.getId());
    }

    let sheet = spreadsheet.getSheetByName("Enquiries");
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Enquiries");
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }

    return sheet;
  } finally {
    lock.releaseLock();
  }
}

function doPost(event) {
  const params = event && event.parameter ? event.parameter : {};
  const token = String(params.submissionToken || "");

  if (!/^[a-f0-9]{32}$/.test(token)) {
    return renderResult(false, "", "This submission could not be verified. Please refresh the page and try again.");
  }

  if (String(params.website || "").trim()) {
    return renderResult(true, token, "Thank you. Your enquiry has been submitted.");
  }

  try {
    const submission = validateSubmission(params);
    const sheet = getEnquiriesSheet();
    const spreadsheet = sheet.getParent();

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet.appendRow([
        new Date(),
        safeCell(submission.studentName),
        safeCell(submission.birthDate),
        safeCell(submission.guardianName),
        safeCell(submission.phone),
        safeCell(submission.email),
        safeCell(submission.school),
        safeCell(submission.address),
        safeCell(submission.className),
        safeCell(submission.board),
        safeCell(submission.subjects),
        safeCell(submission.learningMode),
        safeCell(submission.startDate),
        safeCell(submission.schedule),
        safeCell(submission.notes)
      ]);
    } finally {
      lock.releaseLock();
    }

    let message = "Thank you. Your enquiry has been saved. Our team will be in touch.";
    try {
      const notificationEmail = PropertiesService.getScriptProperties()
        .getProperty(NOTIFICATION_EMAIL_PROPERTY);
      if (!notificationEmail) {
        throw new Error("NOTIFICATION_EMAIL script property is not configured.");
      }
      MailApp.sendEmail({
        to: notificationEmail,
        subject: "New Rajat Learning Academy enrolment enquiry",
        body: "A new enrolment enquiry has been saved. View the details in your private Google Sheet:\n\n" +
          spreadsheet.getUrl()
      });
    } catch (notificationError) {
      console.error("Enquiry saved, but email notification failed: " + notificationError);
      message += " The email notification could not be sent; please check your Google Sheet.";
    }

    return renderResult(true, token, message);
  } catch (error) {
    console.error("Could not save enrolment enquiry: " + error);
    return renderResult(false, token, "We could not save your enquiry. Please try again or contact the academy.");
  }
}

function validateSubmission(params) {
  const fields = {
    studentName: 120,
    birthDate: 10,
    guardianName: 120,
    phone: 16,
    email: 254,
    school: 160,
    address: 500,
    className: 20,
    board: 40,
    subjects: 80,
    learningMode: 40,
    startDate: 10,
    schedule: 30,
    notes: 1000
  };
  const names = {
    className: "class"
  };
  const submission = {};

  Object.keys(fields).forEach(function (key) {
    const sourceName = names[key] || key;
    const value = String(params[sourceName] || "").trim();
    if (value.length > fields[key]) {
      throw new Error("A submitted field is too long: " + sourceName);
    }
    submission[key] = value;
  });

  ["studentName", "birthDate", "guardianName", "phone", "email", "className", "board", "subjects", "learningMode"]
    .forEach(function (key) {
      if (!submission[key]) {
        throw new Error("A required field is missing: " + key);
      }
    });

  if (!isValidDate(submission.birthDate) || (submission.startDate && !isValidDate(submission.startDate))) {
    throw new Error("A submitted date is invalid.");
  }
  if (!/^\+?[0-9]{10,15}$/.test(submission.phone)) {
    throw new Error("The submitted phone number is invalid.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submission.email)) {
    throw new Error("The submitted email address is invalid.");
  }
  if (String(params.consent || "") !== "on") {
    throw new Error("Consent is required.");
  }

  const allowedOptions = {
    className: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"],
    board: ["CBSE", "ICSE", "State Board", "IB / Cambridge", "Other"],
    subjects: ["Mathematics", "Science", "English", "Social Studies", "All core subjects", "Other / discuss with us"],
    learningMode: ["In-person classes", "Online classes", "Either works for us"],
    schedule: ["", "Morning", "Afternoon", "Evening", "Flexible"]
  };
  Object.keys(allowedOptions).forEach(function (key) {
    if (allowedOptions[key].indexOf(submission[key]) === -1) {
      throw new Error("A submitted option is invalid: " + key);
    }
  });

  return submission;
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function safeCell(value) {
  const text = String(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function renderResult(success, token, message) {
  const payload = JSON.stringify({
    type: "bright-path-submission",
    success: success,
    token: token,
    message: message
  });
  const html = "<!doctype html><html><body><script>" +
    "window.parent.postMessage(" + payload + ", '*');" +
    "</script></body></html>";
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
