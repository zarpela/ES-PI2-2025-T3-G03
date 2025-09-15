async function esqueciSenha() {
  const email = prompt("Digite seu e-mail para recuperar a senha:");

  const res = await fetch('http://localhost:3000/esqueci-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const data = await res.json();
  alert(data.message);
}
