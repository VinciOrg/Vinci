// =====================================
// VINCI — NAVEGAÇÃO DE PERFIL 0.6.1
// =====================================


console.log(
  "VINCI — NAVEGAÇÃO DE PERFIL CARREGADA"
);


document.addEventListener(
  "click",
  function(event) {
    
    
    // =================================
    // PROCURAR CABEÇALHO DO USUÁRIO
    // =================================
    
    const postUser =
      event.target.closest(
        ".post-user"
      );
    
    
    if (!postUser) {
      
      return;
      
    }
    
    
    // =================================
    // ENCONTRAR O POST
    // =================================
    
    const post =
      postUser.closest(
        ".vinci-post"
      );
    
    
    if (!post) {
      
      return;
      
    }
    
    
    // =================================
    // PEGAR USER ID
    // =================================
    
    const userId =
      post.dataset.userId;
    
    
    console.log(
      "VINCI — PERFIL CLICADO"
    );
    
    
    console.log(
      "VINCI — USER ID:",
      userId
    );
    
    
    if (!userId) {
      
      console.error(
        "VINCI — USER ID NÃO ENCONTRADO"
      );
      
      return;
      
    }
    
    
    // =================================
    // ABRIR PERFIL
    // =================================
    
    window.location.href =
      "profile.html?id=" +
      encodeURIComponent(
        userId
      );
    
  }
);
