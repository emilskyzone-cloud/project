# Google Play Data safety draft

Verify this against the live Clerk, Cloudinary, Neon, Google AI, analytics, and payment configuration before submitting.

- Account information: email address and user ID, collected for account management and authentication.
- User content: uploaded product/model images, prompts, generated images, and generated videos, collected to provide AI generation and project-history features.
- Purchase information: plan/credit status may be processed to provide paid features. Do not declare payment-card collection unless the app or website directly receives card data rather than a payment processor.
- App activity: generation requests and project history are associated with the signed-in account.
- Data is encrypted in transit over HTTPS.
- Users should be able to request deletion through the account flow or by emailing ai@tyrveai.com. Confirm the public account-deletion URL before submission.
- No advertising SDK is included in this Android package.
- The app only requests INTERNET permission. Image selection uses Android's document picker rather than broad photo-library permission.

Privacy policy URL: https://aimaker.tech/privacy
Support email: ai@tyrveai.com
