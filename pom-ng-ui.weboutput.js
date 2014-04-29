
pomngUI.panel.weboutput = function(elem) {

	this.elem = elem;

	this.elem.html('<h2>Available web outputs :</h2><table class="ui-widget ui-widget-content ui-table"><thead><tr class="ui-widget-header"><td>Name</td><td>Description</td></tr></thead><tbody id="weboutput_list"></tbody></table>');

	var output_names = weboutput.outputs;

	var html = "";
	for (var i = 0; i < output_names.length; i++) {
		html += '<tr><td><a href="#" id="' + output_names[i] + '">' + output_names[i] + '</a></td><td>' + weboutput[output_names[i]].description + '</td></tr>';
	}
	this.elem.find("#weboutput_list").html(html);

	var self = this;
	this.elem.delegate("a", "click", function() {
		var id = this.id;
		self.add(id);
	});

	if (!pomngUI.weboutputs)
		pomngUI.weboutputs = {};

}

pomngUI.panel.weboutput.prototype = new pomngUI.panel();
pomngUI.panel.weboutput.prototype.constructor = pomngUI.panel.weboutput;



pomngUI.panel.weboutput.prototype.add = function(type) {


	if ('parameters' in weboutput[type]) {

		var params = Object.keys(weboutput[type].parameters).sort();

		var param_html = "";

		for (var i = 0; i < params.length; i++) {
			var param = weboutput[type].parameters[i];
			param_html += '<tr><td>' + param.name + '</td><td>';

			if (param.values) {
				param_html += '<select>';
				for (var j = 0; j < param.values.length; j++) {
					param_html += '<option value="' + param.values[j] + '">' + param.values[j] + '</option>';
				}
				param_html += '</select>';
			} else {
				param_html += '<input type="text"/>';
			}
		}
		
		$("#dlg_weboutput_add #tbl_param").html(param_html);
		$("#dlg_weboutput_add #parameters").show();
	} else {
		$("#dlg_weboutput_add #parameters").hide();
	}

	var self = this;
	// Default the name to the output name
	$("#dlg_weboutput_add #name").val("WebOut " + type);
	$("#dlg_weboutput_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a web output",

		buttons: {
			Ok: function() {
				var name = $("#dlg_weboutput_add #name").val();
				
				// Check if an input already exists
				var ids = Object.keys(pomngUI.weboutputs);
				for (var i = 0; i < ids.length; i++) {
					if (pomngUI.weboutputs[ids[i]].output_name == name) {
						alert("A web output with the name '" + name + "' already exists.");
						return;
					}
				}

				var elem_weboutput = $("#weboutput");
				if (!weboutput[type].counter)
					weboutput[type].counter = 0;
				weboutput[type].counter++;
				var id = type + '-' + weboutput[type].counter;
				pomngUI.weboutputs[id] = {};
				pomngUI.weboutputs[id].panel_elem = pomngUI.main.addPanel(id, name);
				pomngUI.weboutputs[id].instance = new weboutput[type](pomngUI.weboutputs[id].panel_elem);
				pomngUI.weboutputs[id].output_name = name;
				pomngUI.main.setPanel(id, pomngUI.weboutputs[id].instance);
				
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}


	});
}


