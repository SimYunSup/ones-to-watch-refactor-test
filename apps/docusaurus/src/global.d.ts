// Ambient types for Docusaurus's webpack-only aliases (@theme/*, @site/*,
// @docusaurus/*, @generated/*) so the editor/tsc can resolve imports like
// `@theme/Layout` and `@docusaurus/useBaseUrl` used throughout src/. Not
// used by the `docusaurus build` script itself — see
// https://docusaurus.io/docs/typescript-support#setup. No
// `@docusaurus/theme-classic` reference: this site doesn't use that theme.
/// <reference types="@docusaurus/module-type-aliases" />
