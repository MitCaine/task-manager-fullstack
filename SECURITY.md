# Security Policy

## Reporting A Vulnerability

Please do not open a public issue for a suspected vulnerability or disclose
credentials, personal data, or exploit details in a pull request.

Use GitHub's **Security** tab and **Report a vulnerability** flow to submit a
private report to the repository maintainer. Include the affected component,
reproduction steps, expected impact, and any suggested mitigation. The maintainer
will acknowledge the report through the private advisory and coordinate disclosure
there.

If private vulnerability reporting is unavailable, open a public issue containing
only a request for a private security contact. Do not include vulnerability details.

## Supported Versions

This repository currently maintains the latest `main` branch. It does not publish
versioned production releases or provide security support for historical commits.

Local development defaults are not production deployment guidance. Operators are
responsible for TLS, database access control, secret management, and platform
signing in their environment.
