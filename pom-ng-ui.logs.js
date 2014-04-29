

pomngUI.panel.logs = function(elem) {
	
	this.elem = elem;
	
	var max_select_options = [ 10, 50, 100, 200, 500 ];

	var html = '<div id="logs_toolbar" class="ui-widget ui-widget-header ui-corner-all toolbar">';
	html += '<form>Max entries : <select id="logs_max">';
	for (var i = 0; i < max_select_options.length; i++)
		html += '<option value="' + max_select_options[i] + '">' + max_select_options[i] + '</option>';

	html += '</select>&nbsp;';
	html += 'Log level : <div id="logs_lvl_radio">';
	html += '<input type="radio" id="lvl_err" name="lvl_radio" value="1"><label for="lvl_err">Error</label>';
	html += '<input type="radio" id="lvl_warn" name="lvl_radio" value="2"><label for="lvl_warn">Warning</label>';
	html += '<input type="radio" id="lvl_info" name="lvl_radio" value="3" checked="checked"><label for="lvl_info">Info</label>';
	html += '<input type="radio" id="lvl_debug" name="lvl_radio" value="4"><label for="lvl_debug">Debug</label>';
	html += '</div></form>';

	html += '</div>';
	
	html += '<div id="logs_loading">Waiting for log entries ...</div>';

	html += '<table id="tbl_logs" class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Timestamp</td><td>Source</td><td>Data</td></tr></thead><tbody></tbody></table>';
	this.elem.html(html);

	this.level_radio = this.elem.find('#logs_lvl_radio').buttonset();
	this.max_entry_select = this.elem.find('#logs_max');
	this.logs_loading = this.elem.find('#logs_loading');

	this.display_level = 3;
	this.max_entries = 50;
	this.max_entry_select.val(this.max_entries);
	this.entry_count = 0;

	this.log_elem = this.elem.find("#tbl_logs tbody");
	this.log_table = this.elem.find("#tbl_logs");
	this.log_table.hide();

	var self = this;
	window.addEventListener("pomng.logs.new", function(event) { 
		self.append(event.detail.entry);
	});

	this.level_radio.click(function(event) {
		var value = $(this).find(":radio:checked").val();
		value = parseInt(value);
		if (value == self.display_level)
			return;
		self.display_level = value;
		self.reload();

	});

	this.max_entry_select.change(function (event) {
		self.max_entries = parseInt(this.value);
		self.reload();
	});

	pomng.logs.pollStart(this.display_level, this.max_entries);

}

pomngUI.panel.logs.prototype = new pomngUI.panel();
pomngUI.panel.logs.prototype.constructor = pomngUI.panel.logs;

pomngUI.panel.logs.prototype.reload = function() {

	this.log_table.hide();
	this.logs_loading.show();
	this.log_elem.find("tr").remove();
	pomng.logs.pollStop();
	this.entry_count = 0;
	pomng.logs.pollStart(this.display_level, this.max_entries);
}

pomngUI.panel.logs.prototype.append = function(entry) {
	
	if (entry.level > this.display_level)
		return;

	this.logs_loading.hide();
	this.log_table.show();

	var cls;
	switch (entry.level) {
		case 1:
			cls = "err";
			break;
		case 2:
			cls = "warn";
			break;
		case 3:
			cls = "info";
			break;
		case 4:
			cls = "debug";
			break;
	}

	var date = entry.timestamp.getFullYear()  + "/" + (entry.timestamp.getMonth() + 1) + "/" + entry.timestamp.getDate() + " " + entry.timestamp.toLocaleTimeString();

	var html = '<tr class="log_' + cls + '" id="log_entry_' + entry.id + '"><td>' + date + '</td><td>'  + entry.file + '</td><td>' + entry.data + '</td></tr>';

	this.log_elem.append(html);

	this.entry_count++;

	if (this.entry_count > this.max_entries)
		this.log_elem.find("tr:first").remove();

}


pomngUI.panel.logs.prototype.cleanup = function() {
	pomng.logs.pollStop();
}
