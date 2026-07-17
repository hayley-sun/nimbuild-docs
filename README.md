# NimBuild Docs

Public documentation for NimBuild Starter, a production-ready AI SaaS starter based on Next.js.

Documentation site: https://hayley-sun.github.io/nimbuild-docs/

This repository contains the MDX source files for the documentation. GitHub can preview each document directly from the links below.

## Documentation

| English | 中文 |
| --- | --- |
| [Introduction](index.mdx) | [简介](index.zh.mdx) |
| [Quickstart](quickstart.mdx) | [快速开始](quickstart.zh.mdx) |
| [Project Structure](project-structure.mdx) | [项目结构](project-structure.zh.mdx) |
| [Development Standards](development-standards.mdx) | [开发规范](development-standards.zh.mdx) |
| [Environment Variables](environment.mdx) | [环境变量](environment.zh.mdx) |

## Modules

| Module | English | 中文 |
| --- | --- | --- |
| Authentication | [Overview](auth/index.mdx), [Firebase Google Sign-In](auth/providers.mdx) | [认证系统概览](auth/index.zh.mdx), [Firebase Google 登录](auth/providers.zh.mdx) |
| Payments | [Overview](payments/index.mdx), [Credit System](payments/credits.mdx), [Webhooks](payments/webhooks.mdx), [Subscription Upgrade Design](payments/subscription-upgrade.mdx) | [支付系统概览](payments/index.zh.mdx), [积分系统](payments/credits.zh.mdx), [Webhooks](payments/webhooks.zh.mdx), [订阅升级设计](payments/subscription-upgrade.zh.mdx) |
| Email | [Email System](email/index.mdx) | [邮件系统](email/index.zh.mdx) |
| Admin | [Admin Dashboard](admin/index.mdx) | [管理后台](admin/index.zh.mdx) |

## Guides

| English | 中文 |
| --- | --- |
| [Deployment](deployment.mdx) | [部署指南](deployment.zh.mdx) |
| [Customization](customization.mdx) | [自定义指南](customization.zh.mdx) |
| [Troubleshooting](troubleshooting.mdx) | [故障排查](troubleshooting.zh.mdx) |

## Notes

- The files are written in MDX so they can be reused by a documentation site such as Nextra, Docusaurus, or another MDX-based renderer.
- GitHub previews Markdown-compatible MDX content, but it does not run custom React components.
