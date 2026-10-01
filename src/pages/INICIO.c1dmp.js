import wixData from 'wix-data';

$w.onReady(function () {

    $w("#dataset1").onReady(async () => {

        try {

            // 1. Buscar noticia marcada como portada
            await $w("#dataset1").setFilter(
                wixData.filter()
                    .eq("portada", true)
            );

            const totalPortada = $w("#dataset1").getTotalCount();

            // 2. Si no hay portada, usar comodín
            if (totalPortada === 0) {

                await $w("#dataset1").setFilter(
                    wixData.filter()
                        .eq("comodin", true)
                );

            }

            // 3. Obtener exactamente la noticia que está mostrando el dataset
            const noticia = $w("#dataset1").getCurrentItem();

            // 4. Sus etiquetas
            const etiquetas = noticia.etiquetas || [];

            // 5. Mostrar SOLO esas etiquetas
            const opciones = etiquetas.map(etiqueta => ({
                label: etiqueta,
                value: etiqueta
            }));

            $w("#selectionTags1").options = opciones;

            // Las dejamos visualmente seleccionadas
            $w("#selectionTags1").value = etiquetas;

        } catch (error) {
            console.error("Error cargando Actualidad:", error);
        }

    });

});