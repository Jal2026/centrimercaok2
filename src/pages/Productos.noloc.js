import wixData from 'wix-data';

let temporizadorBusqueda;

$w.onReady(function () {

    $w("#dynamicDataset").onReady(() => {

        $w("#busqueda").onInput(() => {
            clearTimeout(temporizadorBusqueda);

            temporizadorBusqueda = setTimeout(() => {
                aplicarFiltros();
            }, 300);
        });

        $w("#tags").onChange(() => {
            // Damos tiempo a Wix a procesar el cambio del selector
            setTimeout(() => {
                aplicarFiltros();
            }, 100);
        });

    });

});


async function aplicarFiltros() {

    const texto = ($w("#busqueda").value || "").trim();
    const etiquetas = $w("#tags").value || [];

    // Detecta automáticamente la etiqueta "Todos"
    const opcionTodos = ($w("#tags").options || []).find(
        opcion => (opcion.label || "").trim().toLowerCase() === "todos"
    );

    const valorTodos = opcionTodos ? opcionTodos.value : null;

    const etiquetasActivas = etiquetas.filter(
        valor => valor !== valorTodos
    );

    let filtroEtiquetas = null;

    if (etiquetasActivas.length > 0) {
        filtroEtiquetas = wixData
            .filter()
            .hasSome("subcategoria", etiquetasActivas);
    }


    // SIN TEXTO DE BÚSQUEDA
    if (!texto) {

        await $w("#dynamicDataset").setFilter(
            filtroEtiquetas || wixData.filter()
        );

        return;
    }


    // BUSCA EN TODA LA COLECCIÓN "productos"
    let consulta = wixData.query("productos")
        .contains("nombre", texto)

        .or(
            wixData.query("productos")
                .contains("descripcion", texto)
        )

        .or(
            wixData.query("productos")
                .contains("categoria", texto)
        )

        .or(
            wixData.query("productos")
                .contains("subcategoria", texto)
        )

        .or(
            wixData.query("productos")
                .contains("variantes", texto)
        )

        .or(
            wixData.query("productos")
                .contains("transporte", texto)
        )

        .or(
            wixData.query("productos")
                .contains("conservacion", texto)
        )

        .or(
            wixData.query("productos")
                .contains("maduracion", texto)
        );


    const resultados = await consulta
        .limit(1000)
        .find();

    const ids = resultados.items.map(item => item._id);


    // SIN RESULTADOS
    if (ids.length === 0) {

        await $w("#dynamicDataset").setFilter(
            wixData.filter().eq("_id", "__sin_resultados__")
        );

        return;
    }


    let filtroFinal = wixData
        .filter()
        .hasSome("_id", ids);


    // COMBINA BÚSQUEDA + TAGS
    if (filtroEtiquetas) {
        filtroFinal = filtroFinal.and(filtroEtiquetas);
    }


    await $w("#dynamicDataset").setFilter(filtroFinal);
}