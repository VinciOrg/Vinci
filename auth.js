// ===============================


// -------------------------------
// CADASTRO
// -------------------------------

const signupForm =
  document.getElementById("signupForm");


if (signupForm) {

  signupForm.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      const name =
        document
        .getElementById("name")
        .value
        .trim();


      const username =
        document
        .getElementById("username")
        .value
        .trim()
        .toLowerCase()
        .replace("@", "");


      const email =
        document
        .getElementById("email")
        .value
        .trim();


      const password =
        document
        .getElementById("password")
        .value;


      const message =
        document.getElementById("message");


      message.textContent =
        "Criando sua conta...";


      try {

       const { data, error } =
    await db.auth.signUp({

        email: email,

        password: password,

        options: {

            emailRedirectTo:
                "https://vinciorg.github.io/Vinci/",

            data: {

                name: name,

                username: username

            }

        }

    });


        if (error) {
          throw error;
        }


        message.textContent =
          "Conta criada! Verifique seu e-mail para confirmar.";


        setTimeout(() => {

          window.location.href =
            "login.html";

        }, 2500);


      } catch (error) {

        console.error(error);

        message.textContent =
          error.message;

      }

    }
  );

}


// -------------------------------
// LOGIN
// -------------------------------

const loginForm =
  document.getElementById("loginForm");


if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function(event) {

      event.preventDefault();


      const email =
        document
        .getElementById("email")
        .value
        .trim();


      const password =
        document
        .getElementById("password")
        .value;


      const message =
        document.getElementById("message");


      message.textContent =
        "Entrando...";


      try {

        const { data, error } =
    await db.auth.signUp({

        email: email,

        password: password,

        options: {

            emailRedirectTo:
                "https://vinciorg.github.io/Vinci/",

            data: {

                name: name,

                username: username

            }

        }

    });

console.log("SIGNUP DATA:", data);
console.log("SIGNUP ERROR:", error);

        if (error) {
          throw error;
        }


        message.textContent =
          "Login realizado!";


        window.location.href =
          "profile.html";


      } catch (error) {

        console.error(error);

        message.textContent =
          "E-mail ou senha incorretos.";

      }

    }
  );

}


// -------------------------------
// RECUPERAÇÃO DE SENHA
// -------------------------------

const forgotPasswordButton =
  document.getElementById("forgotPassword");


const forgotPasswordModal =
  document.getElementById("forgotPasswordModal");


const closeForgotModal =
  document.getElementById("closeForgotModal");


const sendReset =
  document.getElementById("sendReset");


const resetEmail =
  document.getElementById("resetEmail");


const resetMessage =
  document.getElementById("resetMessage");


// -------------------------------
// ABRIR MODAL
// -------------------------------

if (forgotPasswordButton) {

  forgotPasswordButton.addEventListener(
    "click",
    function() {

      forgotPasswordModal.classList.remove(
        "hidden"
      );


      resetMessage.textContent = "";


      resetEmail.value =
        document
        .getElementById("email")
        .value
        .trim();


      setTimeout(() => {

        resetEmail.focus();

      }, 100);

    }
  );

}


// -------------------------------
// FECHAR MODAL
// -------------------------------

if (closeForgotModal) {

  closeForgotModal.addEventListener(
    "click",
    function() {

      forgotPasswordModal.classList.add(
        "hidden"
      );

      resetMessage.textContent = "";

    }
  );

}


// -------------------------------
// FECHAR CLICANDO FORA
// -------------------------------

if (forgotPasswordModal) {

  forgotPasswordModal.addEventListener(
    "click",
    function(event) {

      if (
        event.target ===
        forgotPasswordModal
      ) {

        forgotPasswordModal.classList.add(
          "hidden"
        );

        resetMessage.textContent = "";

      }

    }
  );

}


// -------------------------------
// ENVIAR LINK
// -------------------------------

if (sendReset) {

  sendReset.addEventListener(
    "click",
    async function() {

      const email =
        resetEmail.value
        .trim()
        .toLowerCase();


      if (!email) {

        resetMessage.textContent =
          "Digite seu e-mail.";

        resetEmail.focus();

        return;

      }


      sendReset.disabled = true;

      sendReset.textContent =
        "Enviando...";

      resetMessage.textContent = "";


      try {

        const { error } =
          await db.auth.resetPasswordForEmail(
            email,
            {

              redirectTo:
                `${window.location.origin}/Vinci/reset-password.html`

            }
          );


        if (error) {
          throw error;
        }


        resetMessage.textContent =
          "Link enviado! Verifique seu e-mail.";


        sendReset.textContent =
          "Link enviado";


        resetEmail.value = "";


      } catch (error) {

        console.error(error);

        resetMessage.textContent =
          "Não foi possível enviar o link. Tente novamente.";

        sendReset.disabled = false;

        sendReset.textContent =
          "Enviar link de recuperação";

      }

    }
  );

}
