
$w.onReady(function () {

    const repeater = $w("#repeater1");

    function configurarBotones($item, itemData) {

        let telefono = String(itemData.numeroTelefono || "")
            .replace(/\D/g, "");

        if (!telefono) {
            $item("#button20").disable();
            $item("#button21").disable();
            return;
        }

        // Prefijo internacional de España
        if (telefono.startsWith("0034")) {
            telefono = telefono.substring(2);
        }

        if (telefono.length === 9) {
            telefono = "34" + telefono;
        }

        // Botón Llamada
        $item("#button20").link = "tel:+" + telefono;

        // Botón WhatsApp
        $item("#button21").link = "https://wa.me/" + telefono;
        $item("#button21").target = "_blank";

    }

    repeater.onItemReady(configurarBotones);
    repeater.forEachItem(configurarBotones);

});
