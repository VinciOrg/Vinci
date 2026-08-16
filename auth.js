// ===============================
// VINCI AUTH
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
        await db.auth.signInWithPassword({
          
          email: email,
          
          password: password
          
        });
        
        
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