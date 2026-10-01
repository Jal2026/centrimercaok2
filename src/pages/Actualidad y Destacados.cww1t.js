$w.onReady(function () {

    $w("#repeater1").onItemReady(($item, itemData) => {

        const etiquetas = Array.isArray(itemData.etiquetas)
            ? itemData.etiquetas
            : [];

        const opciones = etiquetas.map(etiqueta => ({
            label: etiqueta,
            value: etiqueta
        }));

        $item("#selectionTags1").options = opciones;
        $item("#selectionTags1").value = etiquetas;

    });

});