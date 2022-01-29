$(() => {
    var instancia = new Efectos()
    instancia.imgHover()
    instancia.mostrarOjos()
    instancia.mostrarCert()
    instancia.contactAction()

    var instancia2 = new SendEmail()
    instancia2.enviaForm()
})