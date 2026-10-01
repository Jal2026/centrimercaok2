$w.onReady(function () {

    const coloresBoton = [
        "#5B9A9C", // tarjeta 1
        "#3B82A0", // tarjeta 2
        "#6A8F4E", // tarjeta 3
        "#8A6AAE"  // tarjeta 4
    ];

    const clasesBorde = [
        "borde1",
        "borde2",
        "borde3",
        "borde4"
    ];

    $w("#repeater1").forEachItem(($item, itemData, index) => {

        // COLOR DEL BOTÓN
        $item("#button14").style.backgroundColor = coloresBoton[index];

        // COLOR DEL BORDE DE LA IMAGEN
        $item("#imageX8").customClassList.add(clasesBorde[index]);

    });

});