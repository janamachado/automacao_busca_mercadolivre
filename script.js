const puppeteer = require('puppeteer')

const url = "https://www.mercadolivre.com.br/";
const text = "Luminária de quarto";
let count = 1;
let obj = {};

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
        console.log('Página: ', count)
        count++;

        // Redirecionar para cada link encontrado acima
        await page.goto(link)
        await page.waitForSelector('.ui-pdp-title');
        // Obter título - um $ => apenas o primeiro elemento da classe
        const title = await page.$eval('.ui-pdp-title', h1 => h1.innerText)

        //Obter o preço
        const price = await page.$eval('.andes-money-amount > meta', meta => meta.content)

        // Obter a classificação
        const rate = await page.$eval('.ui-pdp-review__rating', span => span.innerText)
        const quantityRate = await page.$eval('.ui-pdp-review__amount', span => span.innerText.replace(/[()]/g, ''))
        const formatedRate = `Classificação: ${rate} de ${quantityRate}`

        // Identifica se determinado elemento existe => retorna null se não existir
        let seller
        const isSeller = await page.$('.ui-pdp-seller__label-sold')

        // Se existir, obter valor
        if(isSeller){
            seller = await page.$$eval('.ui-pdp-seller__link-trigger-button > span', el => {
    
                const arr = []
                let founded = false
    
                el.forEach(span => {
                    const text = span.innerText
                    if(!founded && text === 'Vendido por'){
                        arr.push("Vendido por: ")
                        founded = true
                    }else if(text !== 'Vendido por'){
                        arr.push(text)
                    }
                });
                return arr.join(', ').replace(" , ", "")
                // return arr

            });
        }else{
            seller = ""
        }

        obj.titulo = title
        obj.preco = price
        obj.classificacao = formatedRate
        obj.link = link
        obj.vendedor = seller
        
        console.log(obj)
        
    }

    await browser.close();
    console.log("Encerrando browser");
})()

