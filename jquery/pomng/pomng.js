
$.widget("pomng.registryparam", {

	options: {
		name: "unnamed",
		type: "string",
		description: "Description not available",
		value: "",
	},

	_create: function() {
		var type = this.options.type;
		var name = 'param_' + this.options.name;
		var unit = this.options.unit;
		if (type == "bool") {
			this.element.html('<div id="radio" class="pomng_bool_btn"><input type="radio" id="yes_' + name + '" name="' + name + '" /><label for="yes_' + name + '">Yes</label><input type="radio" id="no_' + name + '" name="' + name + '" /><label for="no_' + name + '">No</label></div>');
			var radio = this.element.find("#radio").buttonset();
			
			var btn = radio.find('#' + this.options.value + '_' + name);
			btn.prop("checked", true);

			radio.buttonset("refresh");
		} else if (this.options.info && this.options.info.values) {
			// Mandatory values are provided
			this.element.html('<select class="ui-widget ui-widget-content ui-state-focuse ui-corner-all"></select>');
			var select = this.element.find('select');

			var values = this.options.info.values.sort();

			var i;
			for (i = 0; i < values.length; i++) {
				value = pomng.htmlEscape(values[i]);
				if (values[i] == this.options.value)
					select.append('<option value="' + value + '" selected>' + value + '</option>');
				else
					select.append('<option value="' + value + '">' + value + '</option>');
			}


		} else {
			this.element.html('<input type="text" name="' + name + '" value="' + pomng.htmlEscape(this.options.value) + '" class="ui-widget ui-widget-content ui-state-focus ui-corner-all" />');
		}

		if (unit) {
			this.element.append('&nbsp;' + pomng.htmlEscape(unit));
		}
	},

	getval: function() {
		var type = this.options.type;
		if (type == "bool") {
			var id = this.element.find(":radio:checked").attr('id');
			if (id.substr(0,2) == "no") {
				return "no";
			}
			return "yes";
		} else if (this.options.info && this.options.info.values) {
			return this.element.find("select").val();
		} else {
			// We have an input
			return this.element.find("input").val();
		}
	}

});
