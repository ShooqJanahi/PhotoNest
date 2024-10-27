// sendEmail.js

// Initialize EmailJS with your user ID
(function() {
    emailjs.init("T2UveMdpwK5Ln5YIV"); // Replace with your EmailJS user ID
})();

/**
 * Function to send an email using EmailJS.
 * @param {string} recipientEmail - The recipient's email address.
 * @param {string} subject - The subject of the email.
 * @param {string} message - The body of the email.
 */
export function sendEmail(recipientEmail, subject, message) {
    const templateParams = {
        to_email: recipientEmail,
        subject: subject,
        message: message,
    };

    return emailjs.send("service_Email", "template_1", templateParams)
        .then(() => {
            console.log('Email sent successfully!');
        })
        .catch((error) => {
            console.error('Failed to send email:', error);
        });
}

/**
 * Function to send a password generation email.
 * @param {string} recipientEmail - The recipient's email address.
 * @param {string} generatedPassword - The generated password for the user.
 */
export function sendGeneratedPasswordEmail(recipientEmail, generatedPassword) {
    const subject = "Your Account Password";
    const message = `Hello,\n\nYour account has been created successfully. Here is your generated password: ${generatedPassword}\n\nPlease make sure to change your password after logging in.\n\nThank you!`;

    return sendEmail(recipientEmail, subject, message);
}
