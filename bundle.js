!function(t){function o(e){if(n[e])return n[e].exports;var p=n[e]={exports:{},id:e,loaded:!1};return t[e].call(p.exports,p,p.exports,o),p.loaded=!0,p.exports}var n={};return o.m=t,o.c=n,o.p="",o(0)}([function(t,o,n){"use strict";var e=n(1),p=new e.Table;p.read_table_csv_sync("city_property_details_datasd_1.csv"),console.log(p.num_rows())},function(t,o){"use strict";var n=function(){function t(){this._t=[]}return t.prototype.read_table=function(){},t.prototype.read_table_csv_async=function(t,o){var n=this;d3.csv(t,function(t){n._t=t,o()})},t.prototype.read_table_csv_sync=function(t){var o=this;$.ajax({dataType:"text",url:t,async:!1,success:function(t){o._t=d3.csvParse(t)}})},t.prototype.num_rows=function(){return console.log(this._t.length),console.log(this._t),this._t.length},t.prototype.view_rows=function(){},t.prototype.view_row=function(){},t.prototype.labels=function(){},t.prototype.num_columns=function(){},t.prototype.columns=function(){},t.prototype.column=function(){},t.prototype.add_row=function(){},t.prototype.add_column=function(){},t.prototype.relabel=function(){},t.prototype.select_row=function(){},t.prototype.select_column=function(){},t.prototype.delete_row=function(){},t.prototype.delete_column=function(){},t.prototype.where=function(){},t.prototype.sort=function(){},t.prototype.group=function(){},t.prototype.groups=function(){},t.prototype.pivot=function(){},t.prototype.join=function(){},t.prototype.stats=function(){},t.prototype.percentile=function(){},t.prototype.sample=function(){},t.prototype.sample_from_distribution=function(){},t.prototype.split=function(){},t.prototype.show=function(){},t.prototype.plot=function(){},t.prototype.bar=function(){},t.prototype.scatter=function(){},t.prototype.hist=function(){},t.prototype.boxplot=function(){},t}();o.Table=n}]);
//# sourceMappingURL=bundle.js.map