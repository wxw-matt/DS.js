window.$ = window.jQuery = require('jquery');
window.esprima = require('esprima');
window.numeral = require('numeral');
// window.nj = require('numjs');
window.JSHINT = require('jshint').JSHINT;
window.jshint_options = {
    undef: true
};
window._ = require('lodash');
require('../libs/jquery.tableparser.js');
require('./array_last.js');
require('../libs/jquery.ba-bbq.js');

function env_init(_this, code_obj) {
    let datai = $(_this).attr('datai');
    let data_link = $(_this).attr('data-link');

    if ($(_this).attr('class') == 'open-dsjs') {
        window.table_store[`t${datai}`] = new Table.Table(null, null, `${data_link}`);
    } else if ($(_this).attr('class') == 'open-dsjs-htable') {
        window.table_store[`t${datai}`] = new Table.Table(null, null, null);
        window.table_store[`t${datai}`].from_columns($(`.dsjs-htable-${datai}`).parsetable(true, true));
    }

    let env_class = 'env-' + datai;
    let envi = $(`.${env_class}`).length;
    let env_id = `env-${datai}-${envi}`;
    let editor_id = `editor-${datai}-${envi}`;
    // create new environment
    let ds_env = `
        <button id="show-env-${datai}-${envi}" class="show-env" datai="${datai}" envi="${envi}">open</button>
        <div id="${env_id}" class="dsjs-env ${env_class}">
            <div class="buttons">
                <!-- <button datai="${datai}" envi="${envi}" class="run">&#9654;</button> -->
                <button datai="${datai}" envi="${envi}" class="toggle-sg">Select Data</button>
                <button id="hide-env-${datai}-${envi}" datai="${datai}" envi="${envi}" class="hide-env">&#10005;</button>
            </div>
            <div class="repl">
                <div class="inputs">
                    <div id="preview-${datai}-${envi}" class="preview-panel"></div>
                    <div id="${editor_id}" class="editor"></div>
                </div>
            </div>
            <div class="show-panel">
                <div id="vis-${datai}-${envi}" class="vis"></div>
                <div id="table-area-${datai}-${envi}" class="table-area"></div>
                <div id="suggestion-${datai}-${envi}" class="suggestion-panel"></div>
            </div>
            <div style="clear: both"></div>
        </div>
    `;

    let cur = _this;
    let block_styles = ['block', 'inline-block'];
    // find out the first block-displayed parent(or itself)
    while (!block_styles.includes($(cur).css('display'))) {
        cur = $(cur).parent();
    }
    $(cur).after(ds_env);
    let editor = ace.edit(editor_id);
    editor.datai = datai;
    editor.envi = envi;
    editor.last_rown = 0;
    editor.setTheme("ace/theme/chrome");
    editor.getSession().setMode("ace/mode/javascript");
    editor.getSession().setUseWrapMode(true);
    if (code_obj) {
        editor.setValue(code_obj.code);
        editor.gotoLine(code_obj.crow + 1, code_obj.ccol);
    } else {
        editor.setValue(`t${datai}; // This table is denoted as t${datai}`);
    }

    editor.commands.addCommand({
        name: 'preview',
        bindKey: { win: 'Ctrl-B',  mac: 'Command-B' },
        exec: function(_editor) {
            let datai = _editor.datai;
            let envi = _editor.envi;
            if ($(`#env-${datai}-${envi} .preview-panel`).css('display') != 'none') {
                remove_marks(_editor);
                $(`#env-${datai}-${envi} .preview-panel`).hide();
            } else {
                let ast = esprima.parse(_editor.getValue(), { loc: true });
                let row = _editor.getCursorPosition().row;
                let col = _editor.getCursorPosition().column;
                let line = editor.getSession().getLine(row);

                for (let i = 0; i < ast.body.length; i++) {
                    let stmt = ast.body[i];
                    if (row == (stmt.loc.start.line - 1)) {
                        find_and_preview(stmt.expression, _editor, line, row, col, 0, line.length);
                        break;
                    }
                }
            }
        }
    });

    // editor.commands.addCommand({
    //     name: 'cancel-out',
    //     bindKey: { win: 'Esc',  mac: 'Esc' },
    //     exec: function(_editor) {
    //         $('.preview-panel').hide();
    //         $('.suggestion-panel').hide();
    //     }
    // });

    function mark_id(editor, rown, col_start, col_end) {
        let Range = ace.require('ace/range').Range;
        console.log(`${rown} ${col_start}, ${col_end}`);
        let r = new Range(rown, col_start, rown, col_end);
        editor.getSession().addMarker(r, 'preview-hl', 'line');
    }

    function remove_marks(editor) {
        let markers = editor.getSession().getMarkers();
        Object.keys(markers).forEach(function(mk) {
            if (markers[mk].clazz == 'preview-hl') {
                editor.getSession().removeMarker(mk);
            }
        });
    }

    function find_and_preview(expr, editor, line, row, col, cur_start, cur_end) {
        let datai = editor.datai;
        let envi = editor.envi;
        bind_env(datai, envi);
        let callee;
        // console.log(expr);
        // console.log(expr.callee.object.name);
        if (expr.type == 'CallExpression' || expr.type == 'AssignmentExpression') {
            if (expr.type == 'CallExpression') {
                if (expr.arguments) {
                    expr.arguments.forEach(function(arg) {
                        find_and_preview(arg, editor, line, row, col, arg.loc.start.column, arg.loc.end.column);
                    });
                }
                callee = expr.callee;
            } else if (expr.type == 'AssignmentExpression') {
                callee = expr.right.callee;
            }
            let last_callee;
            let callee_level = 0;
            while (callee && ('object' in callee)) {
                let identifier_name = callee.object.name;
                let identifier_start = callee.object.loc.start.column;
                let identifier_end = callee.object.loc.end.column;
                // console.log(`${identifier_name} ${identifier_start} ${identifier_end} ${col}`);
                let method_name = callee.property.name;
                let method_start = callee.loc.end.column - callee.property.name.length;
                let method_end = callee.loc.end.column;
                if (between(col, identifier_start, identifier_end) && (eval(`${identifier_name}`)) && (eval(`${identifier_name}.__showable__`))) {
                    // here we preview an identifier
                    let all_code = editor.getValue().split('\n');
                    let pre_eval_code = '';
                    for (let i = 0; i < row; i++) {
                        pre_eval_code += all_code[i] + '\n';
                    }
                    refresh_table(datai, envi);
                    try {
                        mark_id(editor, row, identifier_start, identifier_end);
                        eval(pre_eval_code);
                        eval(`${identifier_name}.preview('self()')`);
                        let pos = $(`#env-${datai}-${envi} .ace_cursor`).position();
                        $(`#env-${datai}-${envi} .preview-panel`).css({
                            left: pos.left + 50,
                            top: pos.top + 30
                        }).toggle();
                        break;
                    } catch (e) {
                        // console.log(e.message);
                    }
                } else if (is_supported_preview(method_name) && between(col, method_start, method_end)) {
                    // here we preview a method call
                    // console.log(`method ${callee.property.name} found`);
                    let method_call;
                    if (callee_level == 0) {
                        method_call = line.slice(method_start, cur_end);
                    } else {
                        let last_method_start = last_callee.loc.end.column - last_callee.property.name.length;
                        method_call = line.slice(method_start, last_method_start - 1);
                    }

                    // console.log(`method_call: ${method_call}`);
                    let all_code = editor.getValue().split('\n');
                    let pre_eval_code = '';
                    for (let i = 0; i < row; i++) {
                        pre_eval_code += all_code[i] + '\n';
                    }
                    let cur_line_partial = line.slice(cur_start, method_start - 1);
                    // console.log(`cur_line_partial: ${cur_line_partial}`);
                    pre_eval_code += cur_line_partial;
                    refresh_table(datai, envi);
                    try {
                        mark_id(editor, row, method_start, method_end);
                        let partial_result = eval(pre_eval_code);
                        eval(`partial_result.preview(\`${method_call}\`)`);
                        let pos = $(`#env-${datai}-${envi} .ace_cursor`).position();
                        $(`#env-${datai}-${envi} .preview-panel`).css({
                            left: pos.left + 50,
                            top: pos.top + 30
                        }).css('display', 'inline-block');
                        break;
                    } catch (e) {
                        // console.log(e.message);
                    }
                } else {
                    last_callee = callee;
                    callee_level += 1;
                    callee = callee.object.callee;
                }
            }
        }
    }

    function between(i, start, end) {
        return ((i >= start) && (i <= end));
    }

    function is_supported_preview(func_name) {
        let supported_functions = new Set([
            'add_row',
            'add_rows',
            'add_column',
            'add_columns',
            'select_columns',
            'drop_columns',
            'rename_column',
            'where',
            'sorted',
            'groupby',
            'groupsby',
            'pivot',
            'join'
        ]);

        return supported_functions.has(func_name);
    }

    editor.commands.addCommand({
        name: 'hl-preview-methods',
        bindKey: { win: 'Ctrl-G',  mac: 'Command-G' },
        exec: function(_editor) {
            let markers = _editor.getSession().getMarkers();
            Object.keys(markers).forEach(function(mk) {
                if (markers[mk].clazz == 'preview-hl') {
                    _editor.getSession().removeMarker(mk);
                }
            });
            let ast = esprima.parse(_editor.getValue(), { loc: true });
            ast.body.forEach(function(stmt) {
                // console.log(stmt);
                find_and_mark(stmt.expression, _editor);
            });
        }
    });

    editor.commands.addCommand({
        name: 'show-preview-panel',
        bindKey: { win: 'Ctrl-J',  mac: 'Command-J' },
        exec: function(_editor) {
            // console.log(_editor);
            let datai = _editor.datai;
            let envi = _editor.envi;
            let pos = $(`#env-${datai}-${envi} .ace_cursor`).position();
            // console.log(pos);
            $(`#env-${datai}-${envi} .preview-panel`).css({
                left: pos.left + 50,
                top: pos.top + 30
            }).toggle();
        }
    });

    function find_and_mark(expr, editor) {
        // [TODO] mark-ups are messed-up after we change the code
        // console.log(expr);
        let Range = ace.require('ace/range').Range;
        let callee;
        if (expr.type == 'CallExpression' || expr.type == 'AssignmentExpression') {
            if (expr.type == 'CallExpression') {
                if (expr.arguments) {
                    expr.arguments.forEach(function(arg) {
                        // console.log(arg);
                        find_and_mark(arg, editor);
                    });
                }
                callee = expr.callee;
            } else if (expr.type == 'AssignmentExpression') {
                callee = expr.right.callee;
            }

            while (callee && ('object' in callee)) {
                if (is_supported_preview(callee.property.name)) {
                    let r = new Range(callee.loc.start.line - 1, callee.loc.end.column - callee.property.name.length, callee.loc.end.line - 1, callee.loc.end.column);
                    editor.getSession().addMarker(r, "preview-hl", "line");
                }
                callee = callee.object.callee;
            }
        }
    }

    editor.on('click', function(e) {
        // let _editor = e.editor;
        // let row = _editor.getCursorPosition().row;
        // let col = _editor.getCursorPosition().column;
        // console.log(`row: ${row} col: ${col}`);
    });

    editor.on('focus', function(e) {
        $('.suggestion-panel').hide();
    });

    function refresh_table(_datai, _envi) {
        let data_name = `t${_datai}`;
        // let tname = `t${_datai}_${_envi}`;
        let tname = `t${_datai}`;
        // make a new copy of the pre-loaded table
        eval(`
            ${tname} = window.table_store['${data_name}'].copy();
        `);
    }

    editor.selection.on('changeCursor', function() {
        let rown = editor.getCursorPosition().row;
        let cur_line = editor.getSession().getLine(rown);
        if (rown != editor.last_rown) {
            // cursor changes to a new line, we evaluate the code again
            // and get the result
            editor.last_rown = rown;
            let all_code = editor.getValue().split('\n');
            let part_code = all_code.slice(0, rown + 1);
            let code_s = part_code.join('\n');

            window.JSHINT(part_code, window.jshint_options, {});
            let undefs = {};
            window.JSHINT.errors.forEach(function(e) {
                // console.log(e);
                if (e.code == 'W117') {
                    if (!(e.a in undefs)) {
                        undefs[e.a] = [e.line];
                    } else {
                        undefs[e.a].push(e.line);
                    }
                }
            });

            // console.log(undefs);

            let annotations = [];
            Object.keys(undefs).forEach(function(v) {
                undefs[v].forEach(function(l) {
                    annotations.push({
                        row: l - 1,
                        column: 0,
                        text: `${v} is global`,
                        type: 'info'
                    });
                });
            });

            editor.getSession().clearAnnotations();
            editor.getSession().setAnnotations(annotations);

            bind_env(editor.datai, editor.envi);
            refresh_table(editor.datai, editor.envi);

            try {
                let res = eval(code_s);
                setTimeout(function() {
                    if (cur_line.length && res && res.__showable__) {
                        // [TODO] should we use cur_line or all the code?
                        let expr = esprima.parse(cur_line, { loc: true }).body[0];
                        if (expr) {
                            if (expr.type == 'ExpressionStatement') {
                                expr = expr.expression;
                            }
                            if (expr.type == 'AssignmentExpression') {
                                res.show(false, cur_line.slice(expr.left.loc.start.column, expr.left.loc.end.column));
                            } else if (expr.type == 'CallExpression') {
                                res.show(false, cur_line.slice(expr.loc.start.column, expr.loc.end.column));
                            } else if (expr.type == 'Identifier') {
                                res.show(false);
                            }
                        }
                    } else if (cur_line.length) {
                        $(`#table-area-${editor.datai}-${editor.envi}`).html(JSON.stringify(res));
                    } else {
                        $(`#table-area-${editor.datai}-${editor.envi}`).html('');
                    }
                }, 2);
            }
            catch (e) {
                console.log(e);
            }
        }
        update_url();
    });

    function bind_env(_datai, _envi) {
        window.datai = _datai;
        window.envi = _envi;
    }

    editor.session.on('change', function(e) {
        $('.preview-panel').each(function() {
            if ($(this).css('display') != 'none') {
                $(this).hide();
            }
        });
    });

    window._datai = `${datai}-${envi}`;
    $('#' + env_id).toggle();

    $('.run').click(function() {
        let datai = $(this).attr('datai');
        let envi = $(this).attr('envi');
        bind_env(datai, envi);
        $(`#vis-${datai}-${envi}`).html('');
        $(`#table-area-${datai}-${envi}`).html('');
        var editor = ace.edit(`editor-${datai}-${envi}`);
        var code = editor.getValue();
        window._datai = `${datai}-${envi}`;
        // [TODO] use esprima to detect table variable name
        // [TODO] we should also use the current line to decide which table to show
        try {
            let res = eval(code);
            if (res && res.__showable__) {
                res.show();
            } else {
                $(`#table-area-${datai}-${envi}`).html(JSON.stringify(res));
            }
        } catch (e) {
            // console.log(e.message);
        }
    });

    // cancel this out because this will hide the last columns when the table is too big
    // $('.table-area').click(function(e) {
    //     let pos = $(this).position();
    //     let table_pos = $(this).children('.ds-table').position();
    //     if (table_pos) {
    //         let width = $(this).children('.ds-table').width();
    //         let height = $(this).children('.ds-table').height();
    //         if (e.pageX > (table_pos.left + width) || e.pageY > (table_pos.top + height)) {
    //             $(this).siblings('.suggestion-panel').hide();
    //         }
    //     }
    // });

    $('.toggle-sg').click(function() {
        let datai = $(this).attr('datai');
        let envi = $(this).attr('envi');
        SelectorGadget.toggle(datai, envi);
    });

    function update_url() {
        // fetch existing parameters so that we don't
        // mess up with them
        let url_params = $.deparam.querystring(location.search);
        if (url_params.dsjs) {
            delete url_params.dsjs;
        }

        let dsjs_params = {};
        $('.editor').each(function(i) {
            let editor = ace.edit(this);
            let key = `${editor.datai}-${editor.envi}`;
            let pos = editor.getCursorPosition();
            let code = editor.getValue();
            let param = {
                'code': code,
                'crow': pos.row,
                'ccol': pos.column
            };
            dsjs_params[key] = param;
        });
        url_params.dsjs = dsjs_params;
        window.history.pushState('', '', $.param.querystring(window.location.href, url_params));
    }

    $('.hide-env').click(function() {
        let datai = $(this).attr('datai');
        let envi = $(this).attr('envi');
        $(`#env-${datai}-${envi}`).hide();
        $(`#show-env-${datai}-${envi}`).show();
    });

    $('.show-env').click(function() {
        let datai = $(this).attr('datai');
        let envi = $(this).attr('envi');
        $(`#env-${datai}-${envi}`).show();
        $(this).hide();
    });
}

$(document).ready(function() {
    window.table_store = {};
    window.lib_urls = {};
    // [TODO] consider change it to another name to avoid conflicts
    // with window._datai
    let datai = 0;
    // csv detection
    $('a').each(function(i) {
        let data_link = $(this).attr('href');
        if (data_link) {
            data_link = data_link.split('?')[0];
            if (data_link.endsWith('.csv') || data_link.endsWith('.tsv')) {
                $(this).after(`<button id="open-dsjs-${datai}" datai="${datai}" data-link=${data_link} class="open-dsjs">Append DS.js editor</button>`);
                // pre-load the csv file
                // eval(`
                //     window.table_store['t${datai}'] = new Table.Table(null, null, '${data_link}');
                // `);
                datai += 1;
            }
        }
    });

    // html table detection
    $('table').each(function(i) {
        $(this).after(`<button id="open-dsjs-${datai}" datai="${datai}" class="open-dsjs-htable">Append DS.js editor</button>`);
        $(this).addClass(`dsjs-htable-${datai}`);
        // eval(`
        //     window.table_store['t${datai}'] = new Table.Table(null, null, null);
        //     window.table_store['t${datai}'].from_columns($('.dsjs-htable-${datai}').parsetable(true, true));
        // `);
        datai += 1;
    });

    $(".open-dsjs-htable").click(function() {
        let datai = $(this).attr('datai'); // why?
        env_init(this);
    });

    $(".open-dsjs").click(function() {
        env_init(this);
    });

    window.sg_prediction = function(prediction) {
        window.last_prediction = prediction;
    };

    // read url parameters and restore states
    let url_params = $.deparam.querystring(location.search);
    if (url_params.dsjs) {
        Object.keys(url_params.dsjs).forEach(function(datai_envi) {
            let datai;
            let envi;
            [datai, envi] = datai_envi.split('-');
            let code_obj = url_params.dsjs[datai_envi];
            env_init($(`#open-dsjs-${datai}`), code_obj);
        });
    }

    window.using = function(url) {
        if (!window.lib_urls[url]) {
            $.getScript(url).done(function() {
                window.lib_urls[url] = true;
            }).fail(function() {
                return 'load fail';
            });
        }
    }

    $(document).keyup(function(e) {
        // press ESC key to close preview pane and suggestion pane
        if (e.keyCode == 27) {
            $('.preview-panel').hide();
            $('.suggestion-panel').hide();
        }
    });
});