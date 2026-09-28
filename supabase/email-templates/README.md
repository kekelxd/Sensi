# XENSI Supabase Auth Email Templates

These templates are ready to paste into Supabase Auth email templates. They use `{{ if eq .Data.locale "pt-BR" }}` for Brazilian Portuguese and default to English.

Suggested subjects:

- Confirm Sign Up: `{{ if eq .Data.locale "pt-BR" }}Confirme sua conta XENSI{{ else }}Confirm your XENSI account{{ end }}`
- Reset Password: `{{ if eq .Data.locale "pt-BR" }}Redefina sua senha XENSI{{ else }}Reset your XENSI password{{ end }}`
- Change Email Address: `{{ if eq .Data.locale "pt-BR" }}Confirme o novo e-mail da sua conta XENSI{{ else }}Confirm your new XENSI account email{{ end }}`
- Reauthentication: `{{ if eq .Data.locale "pt-BR" }}Código de verificação XENSI{{ else }}XENSI verification code{{ end }}`
- Password Changed: `{{ if eq .Data.locale "pt-BR" }}Sua senha XENSI foi alterada{{ else }}Your XENSI password was changed{{ end }}`
- Email Changed: `{{ if eq .Data.locale "pt-BR" }}O e-mail da sua conta XENSI foi alterado{{ else }}Your XENSI account email was changed{{ end }}`

If the Supabase Dashboard rejects conditional subjects for a template type, use the English fallback subject.
