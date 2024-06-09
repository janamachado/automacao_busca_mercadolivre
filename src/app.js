const puppeteer = require('puppeteer')
const PDFDocument = require('pdfkit');
const fs = require('fs');

const url = "https://www.mercadolivre.com.br/";
const text = "Kombi Azul";
let count = 1
let finalSearch = [{}];

function makePdfName() {
    count++;
    return `resultados_pesquisa_${text.toLowerCase().replace(" ", "_").trim()}_${count.toString().padStart(2, '0')}.pdf`;
}

(async ()=>{
    // Instância do Chrome -> launch = iniciar
    const browser = await puppeteer.launch({
        // headless: false
    });

    //Instância da página no contexto do browser
    const page = await browser.newPage();
    console.log("Iniciando Navegador");

    // Instância do site a partir da URL
    await page.goto(url);
    console.log("Direcionando para URL");

    // Aguardo o carregamento de determinado seletor
    await page.waitForSelector('.nav-search-input');

    // Digitando texto no input determinado pela classe
    console.log("Digitando consulta");
    await page.type('.nav-search-input', text);

    // Aguardando a nevagação que a tecla Enter causará
    await Promise.all([
        page.waitForNavigation(),
        page.keyboard.press('Enter')
    ])
    console.log("Aguardando carregamento da próxima página");

    //Obter links de navegação => dois $$ pois retornará vários elementos = document.querySellector -> retornará o primeiro elemento
    const links = await page.$$eval('.ui-search-item__group--title > a', el => el.map(a => a.href))

    // Percorrer todas as páginas retornadas
    for(const link of links){
        let obj = {}
        if(count >= 15) continue
        console.log('Página: ', count)
        count++;

        // Redirecionar para cada link encontrado acima
        await page.goto(link)
        await page.waitForSelector('.ui-pdp-title');

        // Obter título - um $ => apenas o primeiro elemento da classe
        let title
        const titleExists = await page.$('.ui-pdp-title')
        if(titleExists){
            title = await page.$eval('.ui-pdp-title', h1 => h1.innerText)
        }else{
            price = ""
        }

        //Obter o preço
        let price
        const priceExists = await page.$('.andes-money-amount > meta')
        if(priceExists){
            price = await page.$eval('.andes-money-amount > meta', meta => meta.content)
        }else{
            price = ""
        }

        // Obter a classificação

        let formatedRate = ""
        const rateExists = await page.$('.ui-pdp-review__rating')
        if(rateExists){
            const rate = await page.$eval('.ui-pdp-review__rating', span => span.innerText)
            const quantityRate = await page.$eval('.ui-pdp-review__amount', span => span.innerText.replace(/[()]/g, ''))  
            formatedRate = `${rate} de ${quantityRate}`
        }

        // Identifica se determinado elemento existe => retorna null se não existir
        let seller;
        const sellerExists = await page.$('.ui-pdp-seller__link-trigger-button');
        
        if (sellerExists) {
            seller = await page.$eval('.ui-pdp-seller__link-trigger-button > span:last-child', el => `Vendido por: ${el.innerText}`);
        } else {
            seller = "";
        }

        obj.titulo = title
        obj.preco = price
        obj.classificacao = formatedRate
        obj.link = link
        obj.vendedor = seller
        
        finalSearch.push(obj)
        // console.log("obj:", obj.vendedor)
        // console.log(obj)     

    }

    console.log("Criando PDF com resultado da pesquisa.")
    const doc = new PDFDocument()
    const finalDoc = makePdfName()
    doc.pipe(fs.createWriteStream(finalDoc))

    doc.fontSize(12).text(`Resultados para a pesquisa: ${text}`)
    finalSearch.forEach((item, i)=>{
        // doc.fontSize(10).text(`**Item ${i + 1}:**`);
        // doc.moveDown();
        if (item.titulo) {doc.fontSize(9).text(`Título: ${item.titulo}`)}
        if (item.preco) {doc.fontSize(9).text(`Preço: R$ ${item.preco}`)}
        if (item.classificacao) {doc.fontSize(9).text(`Classificação: ${item.classificacao}`)}
        if (item.link) {doc.fontSize(9).text(`Link: ${item.link}`)}
        if (item.vendedor) {doc.fontSize(9).text(`Vendedor: ${item.vendedor}`)}
        doc.text("__________________________________________________________________________")
        if (i < finalSearch.length - 1) {
            doc.moveDown();
        }
    })

    doc.end()

    await browser.close();
    console.log("Encerrando browser");
})()

