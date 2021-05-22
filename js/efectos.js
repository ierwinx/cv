class Efectos {

    imgHover() {
        $('#yo').mouseover(function(){
            $("#yo").removeClass("imagengris")
        })
        $('#yo').mouseout(function(){
            $("#yo").addClass("imagengris")
        })
    }

    imgSize() {
        $('.imgredonda').height($('.imgredonda').width())
    }

    mostrarOjos() {
        $('#ojo1').click(() => {
            $('#ojo1').css('display', 'none')
            $('#ojo2').css('display', 'block')
            $('.oculta1').fadeToggle('slow')
        })
        $('#ojo2').click(() => {
            $('#ojo2').css('display', 'none')
            $('#ojo1').css('display', 'block')
            $('.oculta1').fadeToggle('slow')
        })

        $('#ojo3').click(() => {
            $('#ojo3').css('display', 'none')
            $('#ojo4').css('display', 'block')
            $('.oculta2').fadeToggle('slow')
        })
        $('#ojo4').click(() => {
            $('#ojo4').css('display', 'none')
            $('#ojo3').css('display', 'block')
            $('.oculta2').fadeToggle('slow')
        })
    }

    mostrarCert() {
        $('.certificados').on('click', function() {
            var nombre = $(this).attr('nombre')
            console.log(nombre)

            $('#imagenCert').html("<img src='img/certificados/" + nombre + ".jpg' class='img-fluid'alt='certificado'>")
            $('#modal').modal()
        })
    }

    enviaForm() {
        $('form').submit(e => {
            e.preventDefault()
            var datos = $('form').serialize()
            console.log(datos)
            $('form')[0].reset()

            $('#tituloModal').text('Enviando información')
            $('#colormodal').addClass('bg-info')
            $('#contenidopeticion').html("<div class='loader'></div>")
            $('#modal2').modal()

            fetch('http://localhost/ls', { 
                method: 'POST',
                mode: 'cors',
                body: datos
            }).then((resp) => {
                $('#colormodal').addClass('bg-success')
                $('#colormodal').removeClass('bg-info')
                $('#colormodal').removeClass('bg-danger')
                $('#contenidopeticion').html("Se envio correctamente la informacion")
            }).catch((error) => {
                $('#colormodal').addClass('bg-danger')
                $('#colormodal').removeClass('bg-info')
                $('#colormodal').removeClass('bg-success')
                $('#contenidopeticion').html("Error al enviar la peticion")
                console.log(error)
            })
            
        })
    }

}


var instancia = new Efectos()
instancia.imgHover()
instancia.mostrarOjos()
instancia.mostrarCert()
instancia.enviaForm()
instancia.imgSize()
