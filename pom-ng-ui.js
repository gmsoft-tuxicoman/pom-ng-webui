
var pomngUI = {};
pomngUI.registry = {};
pomngUI.menu = {};

pomngUI.init = function () {


	// Update the title
	pomng.call("core.getVersion",
		function (response, status, jqXHR) {
			pomng.version = response[0];
			document.title = pomng.title + " - Connected to version " + pomng.version; }
	);

	pomngUI.menu.init();
	pomngUI.registry.need_init = true;

}

pomngUI.menu.init = function () {
	$("#menu button").button();

	$("#menu #btn_config").click(function () { pomngUI.menu.hideAll(); $("#config").show(); });
	$("#menu #btn_registry").click(function () {
		if (pomngUI.registry.need_init)
			pomngUI.registry.init();
		pomngUI.menu.hideAll();
		$("#registry").show();
	});


}

pomngUI.menu.hideAll = function () {
	$("#config, #registry").hide();
}

pomngUI.registry.init = function (id) {

	pomngUI.registry.need_init = false;

	$(id).append('<div id="registry" class="ui-widget-header ui-corner-all"/></div>');

	var keys = Object.keys(pomng.registry.classes).sort();

	for (var i = 0; i < keys.length; i++) {
		var cls_name = keys[i];
		var avail_types = Object.keys(pomng.registry.classes[cls_name].available_types);
		var addButton = "";
		if (avail_types.length > 0)
			addButton = ' <span class="ui-icon ui-icon-circle-plus" id="btn_add_' + cls_name + '" style="display:inline-block" onclick="pomngUI.registry.dialogAddOpen(\'' + cls_name + '\')"/>';
		$(id + " #registry").append('<span class="ui-icon ui-icon-triangle-1-e" style="display:inline-block"/>' + keys[i] + addButton + '<div id="' + keys[i] + '" class="ui-widget-content ui-corner-all" style="margin-left:16px"></div>');
	}
}

pomngUI.registry.updateClass = function(id, cls) {

	if (!pomngUI.registry.need_init)
		return;

	var inst_names = Object.keys(pomng.registry.classes[cls].instances).sort();

	var avail_types = Object.keys(pomng.registry.classes[cls].available_types);

	var instHtml = "";
	for (var i = 0; i < inst_names.length; i++) {
		var inst_name = inst_names[i];
		instHtml += '<div id="' + inst_name + '"><span class="ui-icon ui-icon-carat-1-e" style="display:inline-block"/>' + inst_name;
		
		var inst = pomng.registry.classes[cls].instances[inst_name];
		var p_type = inst.parameters["type"];

		if (p_type !== undefined)
			instHtml += " (" + p_type.value + ")";

		if (avail_types.length > 0)
			instHtml += "[x]";

		instHtml += '</div>';
	}

	$(id + " #registry #" + cls).html(instHtml);

}

pomngUI.registry.dialogAddOpen = function(cls) {

	
	var options = ""
	var avail_types = Object.keys(pomng.registry.classes[cls].available_types);
	for (var i = 0; i < avail_types.length; i++)
		options = options + '<option value="' + avail_types[i] + '">' + avail_types[i] + '</option>';

	$("#dlg_add #instance_type").html(options);
	$("#dlg_add #instance_name").val("");
	$("#dlg_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add an instance of " + cls,

		buttons: {
			"Add": function() {
				var type = $("#dlg_add #instance_type").val();
				var name = $("#dlg_add #instance_name").val();
				if (name.length == 0) {
					alert("You must specify a name");
					return;
				}
				pomng.registry.addInstance(cls, name, type);
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});
	

}
