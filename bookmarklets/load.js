javascript: (
    function() {
        function js_load(url, cb) {
            console.log(`loading ${url}`);

            var js = document.createElement('script');
            js.src = url;
            if (cb) {
                js.onload = cb;
            }
            document.body.appendChild(js);
        }

        function css_load(url, cb) {
            var css = document.createElement('link');
            css.setAttribute('href', url);
            css.setAttribute('rel', 'stylesheet');
            css.onload = cb;
            document.head.appendChild(css);
        }

        sg_js_load = () => js_load('https://www.bearzx.com/ds.js/out/selectorgadget_combined.js');
        sg_css_load = () => css_load('https://www.bearzx.com/ds.js/out/selectorgadget_combined.css', sg_js_load);
        bundle_js_load = () => js_load('https://www.bearzx.com/ds.js/out/bundle.js', sg_css_load);
        bundle_css_load = () => css_load('https://www.bearzx.com/ds.js/out/ds.js.css', bundle_js_load);
        vge_load = () => js_load('https://cdnjs.cloudflare.com/ajax/libs/vega-embed/2.2.0/vega-embed.js', bundle_css_load);
        vgl_load = () => js_load('https://cdnjs.cloudflare.com/ajax/libs/vega-lite/1.3.1/vega-lite.js', vge_load);
        vega_load = () => js_load('https://www.bearzx.com/ds.js/out/vega.js', vgl_load);
        d3csv_load = () => js_load('https://d3js.org/d3-dsv.v1.min.js', vega_load);
        d3_load = () => js_load('https://d3js.org/d3.v3.min.js', d3csv_load);

        js_load('https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.6/ace.js', d3_load);
    }()
);