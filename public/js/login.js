import { bindLoginForm } from './auth.js';

bindLoginForm({
  formEl:     document.getElementById('loginForm'),
  emailEl:    document.getElementById('email'),
  passwordEl: document.getElementById('password'),
  errorEl:    document.getElementById('error'),
  onSuccessRedirect: 'dashboard.html',
});
