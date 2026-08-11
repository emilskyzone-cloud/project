import * as Sentry from "@sentry/node";

Sentry.init({
    dsn: "________sentry_dsn________",
    sendDefaultPii: true,
});
