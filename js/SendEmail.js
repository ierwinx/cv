class SendEmail {

    enviaForm() {
        $('form').submit(e => {
            e.preventDefault()
            let form = $('form').serializeArray()

            if (form[5].value == "") {
                $("#errorRecaptcha").html("The filed is required")
            } else {
                $("#errorRecaptcha").html("")

                var datos = {
                    nombre: form[0].value,
                    apellido1: form[1].value,
                    empresa: form[2].value,
                    email: form[3].value,
                    mensaje: form[4].value
                }
                datos["g-recaptcha-response"] = form[5].value
    
                $('form')[0].reset()
                $('#tituloModal').text('Sending information')
                $('#colormodal').addClass('bg-info')
                $('#contenidopeticion').html("<div class='loader'></div>")
                $('#modal3').modal('hide')
                $('#modal2').modal('show')

                grecaptcha.reset()

                emailjs.init("user_km4RSsF30l5sCapcs0ucE")
                emailjs.send("service_nqyh7vk", "template_cq9vtfz", datos).then((resp) => {
                    console.log(resp)
                    $('#colormodal').addClass('bg-success')
                    $('#colormodal').removeClass('bg-info')
                    $('#colormodal').removeClass('bg-danger')
                    $('#contenidopeticion').html("The information has been sended correctly")
                }, (error) => {
                    console.log(error)
                    $('#colormodal').addClass('bg-danger')
                    $('#colormodal').removeClass('bg-info')
                    $('#colormodal').removeClass('bg-success')
                    $('#contenidopeticion').html("There are problems sending information")
                })

            }

        })
    }

}