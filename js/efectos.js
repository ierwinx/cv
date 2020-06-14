class Efectos {

    imgHover() {
        $('#yo').mouseover(function(){
            $("#yo").removeClass("imagengris")
        })
        $('#yo').mouseout(function(){
            $("#yo").addClass("imagengris")
        })
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

}


var instancia = new Efectos()
instancia.imgHover()
instancia.mostrarOjos()
instancia.mostrarCert()
