/* eslint global-require: "off", no-console: "off" */
const app = require('express')()
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const rewrite = require('express-urlrewrite')

const { baseUrl, isDev, isNow } = require('./util')

app.use(cookieParser())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

// Forward next + statics requests to the right route handlers
app.use(rewrite(`${baseUrl}/_next/*`, '/_next/$1'))
app.use(rewrite(`${baseUrl}/static/*`, '/static/$1'))

// Prettify all json by default
app.use(require('./middleware/prettyPrintJson'))

// Authentication
// All auth is handled by the /login route. In production, /login/shib is
// a special Shib-protected route. When a user is directed to that page,
// they'll need to sign in to Shib if they aren't already. Then, the request
// will hit that page with their user information present in headers. We can
// then establish our own session with them, which can persist beyond Shib's
// authentication restrictions.
if (isDev || isNow) {
  app.use(`${baseUrl}/login/dev`, require('./auth/dev'))
}
app.use(`${baseUrl}/login/shib`, require('./auth/shibboleth'))
app.use(`${baseUrl}/logout`, require('./auth/logout'))

app.use(`${baseUrl}/api`, require('./middleware/authnJwt'))
app.use(`${baseUrl}/api`, require('./middleware/authz'))

// This will selectively send redirects if the user needs to (re)authenticate
// Useful mostly on initial page load - avoids having to detect that we
// aren't authed on the client and redirect there.
app.use(`${baseUrl}/`, require('./middleware/redirectIfNeedsAuthn'))

// API routes
app.use(`${baseUrl}/api/users`, require('./api/users'))
app.use(`${baseUrl}/api/courses`, require('./api/courses'))
app.use(`${baseUrl}/api/queues`, require('./api/queues'))
app.use(`${baseUrl}/api/questions`, require('./api/questions'))
app.use(`${baseUrl}/api/courses/:courseId/queues`, require('./api/queues'))
app.use(
  `${baseUrl}/api/courses/:courseId/queues/:queueId/questions`,
  require('./api/questions')
)
app.use(`${baseUrl}/api/queues/:queueId/questions`, require('./api/questions'))

// Support for course shortcodes
app.use(`${baseUrl}/:courseCode`, require('./middleware/courseShortcodes'))

// Support for redirects of nonexistent queues
app.use(`${baseUrl}/queue/:queueId`, require('./middleware/redirectNoQueue'))

// Error handling! This middleware should always be the last one in the chain.
app.use(require('./middleware/handleError'))

module.exports = app
