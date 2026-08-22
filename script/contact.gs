/**
 * Contact form backend for amirifinearts.com.
 *
 * This is not part of the Jekyll build. It is kept here so the code that
 * receives the form lives next to the form that sends it -- otherwise it exists
 * only inside a Google account, where nothing is versioned and nobody can find
 * it a year later.
 *
 * ---------------------------------------------------------------------------
 * Deploying it (once, from avand@avandamiri.com)
 * ---------------------------------------------------------------------------
 *
 *  1. Create a Google Sheet named "Amiri Fine Arts — Contact".
 *  2. Extensions -> Apps Script. Paste this file in, replacing Code.gs.
 *  3. Set NOTIFY below to the address that should be emailed on each message.
 *  4. Deploy -> New deployment -> type "Web app".
 *       Execute as:    Me (avand@avandamiri.com)
 *       Who has access: Anyone
 *     "Anyone" is required -- the form posts without a Google login. It also
 *     means the URL is world-writable, which is what the honeypot and the
 *     length caps below are for.
 *  5. Copy the /exec URL into `contact_endpoint` in _config.yml.
 *
 * Editing this later does NOT change what is live. Apps Script serves the
 * deployed *version*, so a change needs Deploy -> Manage deployments -> edit ->
 * version "New version". Skipping that is the classic "I fixed it and nothing
 * happened" with Apps Script.
 */

var NOTIFY = "";            // e.g. "fahimeh@example.com" -- set before deploying
var SHEET = "Submissions";
var MAX = { name: 100, email: 200, message: 4000, form: 40 };

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // The honeypot is invisible to people and irresistible to bots. Return OK
    // rather than an error: a bot that learns it was rejected tries again.
    if (p.website) {
      return ok();
    }

    var name = clamp(p.name, MAX.name);
    var email = clamp(p.email, MAX.email);
    var message = clamp(p.message, MAX.message);
    // Which page it came from: "Contact" or "Enroll". Both forms post here, and
    // an enrolment should never be read as a general enquiry.
    var form = clamp(p.form, MAX.form) || "Contact";

    if (!name || !email || !message) {
      return ok();
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return ok();
    }

    var sheet = sheetFor();
    sheet.appendRow([new Date(), form, name, email, message]);

    if (NOTIFY) {
      // Wrapped on its own: the row is the record, and a mail quota that runs
      // out must not cost us a message that is already safely written down.
      try {
        MailApp.sendEmail({
          to: NOTIFY,
          replyTo: email,
          subject: "amirifinearts.com — " + form + " — " + name,
          body: name + " <" + email + ">\n\n" + message,
        });
      } catch (mailError) {
        console.error("notify failed: " + mailError);
      }
    }

    return ok();
  } catch (error) {
    // The page posts no-cors and cannot read this either way, so the log is
    // the only place a failure is visible. Check it if mail goes quiet.
    console.error(error);
    return ok();
  }
}

function sheetFor() {
  var book = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = book.getSheetByName(SHEET);
  if (!sheet) {
    sheet = book.insertSheet(SHEET);
    sheet.appendRow(["Received", "Form", "Name", "Email", "Message"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function clamp(value, max) {
  return String(value == null ? "" : value).trim().slice(0, max);
}

/**
 * The browser posts with mode "no-cors" and is not permitted to read anything
 * we return, so the body is for curl and the Apps Script console, not the form.
 */
function ok() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true })
  ).setMimeType(ContentService.MimeType.JSON);
}
