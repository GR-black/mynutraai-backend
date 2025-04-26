require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');  // Importando o Puppeteer
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors()); // Permite requisições do front-end
app.use(express.static('public')); // Para servir arquivos estáticos

// Configuração da API OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Função para gerar treino e dieta com a API OpenAI
async function gerarTreinoEDieta(userData) {
  const prompt = `
  Você é um especialista e expert em nutrição, musculação, saúde e treino. Baseado nos seguintes dados:

  ${userData.nome || "Não informado"}
  ${userData.idade || "Não informado"}
  ${userData.peso || "Não informado"}
  ${userData.altura || "Não informado"}
  ${userData.genero || "Não informado"}
  ${userData.objetivo || "Não informado"}
  ${userData.calorias || "Não informado"}
  ${userData.nivelAtividade || "Não informado"}
  ${userData.suplementos || "Não informado"}
  ${userData.agua || "Não informado"}
  ${userData.preferenciaTreino || "Não informado"}
  ${userData.nivelTreino || "Não informado"}
  ${userData.diasSemana ? userData.diasSemana.join(", ") : "Não informado"}

  Gere um plano de treino e dieta único, completo e personalizado, com dieta e treino realmente eficaz, baseado nos objetivos do usuário.
  
  Sua resposta deve ter a seguinte estrutura de exemplo:
  Exemplo de resposta:
  
  💪 PLANO DE TREINO (Dê a melhor divisão e treino conforme os dias disponíveis, preferências e objetivo do usuário)
  (exemplo: se só tem 1 dia, talvez só seja possível fazer fullbody ou alguma rotação)
    (exemplo: se só tem 1 dia, talvez só seja possível fazer fullbody ou alguma rotação)
    (exemplo: se só tem 2 dias, talvez um upper-lower)
    (exemplo: se tem 5 dias, já da pra divir em grupos musucalares melhor)
    (exemplo: se tem mais que 5 dias, já da pra divir em grupos musucalares melhor e distribuir melhor os descansos)

  📆 Dias Disponíveis: 
  🎯 Objetivo:
  💦 Água recomendada:

  1️⃣ Segunda-feira: Peito e Tríceps
   - Supino Reto: 4 séries de 12 repetições.
   - Supino Inclinado: 3 séries de 12 repetições.
   - Crucifixo: 2 séries de 12 repetições.
   - Pulley Tríceps: 4 séries de 12 repetições.
   - Tríceps Testa: 3 séries de 10 repetições.

  2️⃣ Terça-feira: Pernas
   - Agachamento Livre: 4 séries de 12 repetições.
   - Cadeira Extensora: 3 séries de 15 repetições.

  3️⃣ Quarta-feira: Ombros
   - Desenvolvimento Ombros: 4 séries de 10 repetições.
   - Elevação Lateral: 3 séries de 12 repetições.

  4️⃣ Quinta-feira: Costas e Bíceps
   - Barra Fixa: 4 séries de 8 repetições.
   - Remada Curvada: 3 séries de 12 repetições.
   - Rosca Direta: 4 séries de 10 repetições.
   - Martelo: 3 séries de 12 repetições.

  5️⃣ Sexta-feira: Pernas
   - Agachamento Livre: 4 séries de 12 repetições.
   - Cadeira Extensora: 3 séries de 15 repetições.

  💡 Dica: dê uma dica para o plano de treino.


  🥗 PLANO DE DIETA (Calcule a quantidade de refeições ideal (não precisa ser sempre 8, especialmente se o usuário deseja emagrecer por exemplo) e todo o resto conforme as preferências e objetivo do usuário)
  (Mostre a quantidade de cada alimento em sua resposta, conforme o exemplo do café da manhã)
  🧾 Calorias Desejadas: 

  📌 Macros diários 
  Calorias:  | Proteína:  | Carboidrato:  | Gorduras:

  1️⃣ Café da Manhã (650 kcal, 65g carb, 45g prot, 20g gord):
  - Omelete de 4 ovos (240g) com queijo cottage (30g).
  - Aveia (40g) com banana (100g) e mel (10g).
  - Suco natural de laranja (200ml).

  2️⃣ Lanche da Manhã (500 kcal, 50g carb, 35g prot, 15g gord):
  - Batata-doce cozida (150g).
  - Peito de frango grelhado (120g).

  3️⃣ Almoço (900 kcal, 100g carb, 65g prot, 25g gord):
  - Arroz integral (150g) e feijão preto (100g).
  - Filé de peixe assado (150g) ou peito de frango.
  - Salada de folhas verdes (rúcula, alface, tomate) com azeite (10ml).

  4️⃣ Lanche da Tarde (600 kcal, 70g carb, 45g prot, 15g gord):
  - Shake proteico
  - Leite integral (200ml) + Whey Protein (30g) + Aveia (30g) + Banana (100g).

  5️⃣ Pré-Treino (350 kcal, 50g carb, 20g prot, 10g gord):
  - Pasta de amendoim (20g) com torradas integrais (2 unid).
  - Leite desnatado (150ml).

  6️⃣ Pós-Treino (450 kcal, 60g carb, 40g prot, 5g gord):
  - Shake de Whey Protein (30g) com água de coco (200ml).
  - Banana (100g).

  7️⃣ Jantar (800 kcal, 90g carb, 55g prot, 20g gord):
  - Quinoa (150g) ou arroz integral.
  - Salmão grelhado (150g).
  - Brócolis e cenoura cozidos.

  8️⃣ Ceia (300 kcal, 15g carb, 25g prot, 10g gord):
  - Iogurte grego natural (200g).
  - Mix de castanhas (15g).


  💊 SUPLEMENTAÇÃO (caso o usuário escolha usar suplementação, mostre uma seção como essa de exemplo a ele, PERSONALIZADA conforme suas preferências e objetivo)

  1️⃣ Whey Protein (30g)
  📌 Benefícios: Recuperação muscular, aumento da síntese proteica.
  🕐 Tomar: Pós-treino ou no café da manhã.

  2️⃣ Creatina (5g)
  📌 Benefícios: Aumenta força e resistência, melhora a recuperação.
  🕐 Tomar: Qualquer horário do dia, todos os dias.

  3️⃣ Albumina (30g)
  📌 Benefícios: Proteína de absorção lenta, ideal para manter a síntese proteica à noite.
  🕐 Tomar: Antes de dormir ou no café da manhã.
  
  4️⃣ Multivitamínico
  📌 Benefícios: Supre deficiências de vitaminas e minerais essenciais.
  🕐 Tomar: Pela manhã.
  
  5️⃣ BCAA (10g)
  📌 Benefícios: Redução da fadiga muscular, melhora na recuperação.
  🕐 Tomar: Antes e depois do treino.

  6️⃣ Ômega-3 (1-2g)
  📌 Benefícios: Reduz inflamações, melhora a saúde cardiovascular.
  🕐 Tomar: Durante o almoço.

  7️⃣ Glutamina (10g)
  📌 Benefícios: Fortalece o sistema imunológico e melhora a recuperação muscular.
  🕐 Tomar: Antes de dormir.

  . Agora, conforme as informações e preferências do usuário monte sua própria resposta única.
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.6,
    });

    const planoTexto = response.choices[0].message.content || "Plano não gerado corretamente";

    const plano = {
      nome: userData.nome || "Não informado",
      email: userData.email || "Não informado",
      idade: userData.idade || "Não informado",
      peso: userData.peso || "Não informado",
      altura: userData.altura || "Não informado",
      genero: userData.genero || "Não informado",
      objetivo: userData.objetivo || "Não informado",
      planop: planoTexto,  // A resposta do plano
    };

    return plano;
  } catch (error) {
    console.error("Erro ao processar resposta da OpenAI:", error);
    return { error: "Erro ao gerar plano" };
  }
}

// Função para gerar PDF usando Puppeteer e preencher a página HTML
async function gerarPDF(plano, nomeArquivo) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Carregar o conteúdo da página PLANOS.html
  const planFilePath = path.join(__dirname, 'Plano.html');
  await page.goto('file://' + planFilePath, { waitUntil: 'load' });

  // Passar o objeto `plano` corretamente para o contexto da página
  await page.evaluate((plano) => {
    const element = (selector) => document.querySelector(selector);
    console.log('Plano:', plano);  // Verifique os dados sendo passados
    
    if (element('#nome')) element('#nome').innerText = plano.nome || 'Não informado';
    if (element('#idade')) element('#idade').innerText = plano.idade || 'Não informado';
    if (element('#peso')) element('#peso').innerText = plano.peso || 'Não informado';
    if (element('#altura')) element('#altura').innerText = plano.altura || 'Não informado';
    if (element('#genero')) element('#genero').innerText = plano.genero || 'Não informado';
    if (element('#objetivo')) element('#objetivo').innerText = plano.objetivo || 'Não informado';
    if (element('#plano')) element('#plano').innerText = plano.planop || 'Não informado';
  }, plano);  // Passando o plano para o contexto da página

  // Gerar o PDF a partir do conteúdo da página preenchida
  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();

  // Salvar o PDF na pasta 'planos'
  const caminhoArquivo = path.join(__dirname, 'planos', nomeArquivo);
  fs.writeFileSync(caminhoArquivo, pdfBuffer);
  console.log(`PDF gerado e salvo em: ${caminhoArquivo}`);

  return caminhoArquivo;
}

// Função para enviar e-mail com o PDF
async function enviarEmailComPDF(pdfPath, email, nomeArquivo) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Seu Plano Personalizado',
    text: 'Seu plano de dieta e treino foi gerado com sucesso! Baixe o PDF em anexo.',
    attachments: [
      {
        filename: nomeArquivo,
        path: pdfPath, // Usando o caminho do arquivo gerado
      },
    ],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Plano enviado com sucesso!');
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
  }
}

// Endpoint para gerar o plano de treino e dieta e enviar o PDF
app.post('/obter-dados', async (req, res) => {
  console.log("Dados recebidos:", req.body);  // Verifique os dados que estão sendo enviados
  const userData = req.body;

  // Supondo que gerarTreinoEDieta seja uma função que gera o plano a partir dos dados do usuário
  const plano = await gerarTreinoEDieta(userData);

  if (plano.error) {
    console.error("Erro no plano gerado:", plano.error);  // Log de erro
    return res.status(500).json({ message: plano.error });
  }

  console.log("Plano gerado com sucesso:", plano);  // Log do plano gerado

  try {
    // Gerar o PDF
    const nomeArquivo = `plano_${Date.now()}.pdf`;
    const pdfPath = await gerarPDF(plano, nomeArquivo);

    // Enviar o PDF por e-mail
    await enviarEmailComPDF(pdfPath, plano.email, nomeArquivo);

    res.status(200).json({ message: 'Plano gerado e enviado com sucesso!', caminho: pdfPath });
  } catch (error) {
    console.error('Erro ao salvar ou enviar o PDF:', error);
    res.status(500).json({ message: 'Erro ao salvar ou enviar o PDF.' });
  }
});

// Endpoint para listar arquivos na pasta 'planos'
app.get("/listar-planos", (req, res) => {
  const dir = path.join(__dirname, "planos");
  fs.readdir(dir, (err, files) => {
    if (err) {
      return res.status(500).send({ message: "Erro ao ler a pasta", error: err });
    }
    res.json(files); // Retorna os nomes dos arquivos na pasta
  });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});