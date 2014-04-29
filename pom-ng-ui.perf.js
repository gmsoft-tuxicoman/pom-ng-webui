
pomngUI.panel.perf = function(elem) {

	this.elem = elem;

	this.graphs = [];
	this.perfs = {};
	this.graph_count = 0;
	this.poll_interval = 1000;
	this.max_time = 60 * 5;

	this.elem.html('<div id="toolbar" class="ui-widget ui-widget-header ui-corner-all toolbar"><button id="add_graph">Add graph</button></div><div id="perf_graphs"></div>');
	this.graphs_elem = this.elem.find('#perf_graphs');

	var self = this;
	this.graphs_elem.delegate("#graph_config", "click", function () {
		var id = parseInt(this.parentElement.id);
		self.graphConfig(id);

	});

	this.graphs_elem.delegate("#graph_remove", "click", function () {
		var id = parseInt(this.parentElement.id);
		self.removeGraph(id);
	});

	this.elem.find("#add_graph").button().click(function(event) {
		self.addTemplateDialog();
	});

}

pomngUI.panel.perf.prototype = new pomngUI.panel();
pomngUI.panel.perf.prototype.constructor = pomngUI.panel.perf;


pomngUI.panel.perf.prototype.activate = function() {
	this.activated = true;

	for (var i = 0; i < this.graphs.length; i++) {
		this.plot(i);
	}
}

pomngUI.panel.perf.prototype.deactivate = function () {
	this.activated = false;
}

pomngUI.panel.perf.prototype.plot = function(id) {

	if (!this.activated)
		return;

	var options = {
		xaxis: {
			mode: "time",
			timezone: "browser",
		},
		yaxis: {
			min: 0,
			position: "right",
		},
		legend: {
			position: "nw",
		}

	};

	var graph = this.graphs[id];
	var elem = $('#' + graph.elem_id);

	var plot_data = [];

	var has_data = false;

	for (var i = 0; i < graph.perfs.length; i++) {
		var perf_id = graph.perfs[i];
		var perf = this.perfs[perf_id];
		if (perf.series.length > 1)
			has_data = true;
		plot_data.push({ label: perf.label, data: perf.series });
	}

	if (!has_data) {
		elem.text("Fetching initial data ...");
	} else {
		elem.text('');
		$.plot(elem, plot_data, options);
	}
}

pomngUI.panel.perf.prototype.addGraph = function(graph) {

	// Variable graph is an object with properties height, width, title

	var id = this.graphs.length;
	graph.elem_id = 'graph-' + this.graph_count;
	this.graph_count++;

	graph.perfs = [];

	this.graphs[id] = graph;


	this.graphs_elem.append('<div id="' + graph.elem_id + '_container" style="padding-top:1em"><h4>' + graph.title + '</h4><span style="float:right" id="' + id + '"><span class="ui-icon ui-icon-gear icon-btn" id="graph_config"></span><span class="ui-icon ui-icon-close icon-btn" id="graph_remove"></span></span><div id="' + graph.elem_id + '" style="width:' + graph.width + ';height:' + graph.height + '"></div></div>');

	if (this.activated)
		this.plot(id);

	return id;
}

pomngUI.panel.perf.prototype.addPerfToGraph = function(graph_id, perf) {
	
	var perf_id;
	var perf_reg;
	if (perf.instance === undefined) {
		perf_id = 'cls_' + perf.class + '_' + perf.name;
		perf_reg = pomng.registry.classes[perf.class].performances[perf.name];
		perf.label = 'Class ' + perf.class + ' ' + perf.name;
	} else {
		perf_id = 'inst_' + perf.class + '_' + perf.instance + '_' + perf.name;
		perf_reg = pomng.registry.classes[perf.class].instances[perf.instance].performances[perf.name];
		perf.label = perf.class.charAt(0).toUpperCase() + perf.class.slice(1) + ' ' + perf.instance + ' ' + perf.name;
	}

	if (perf_reg.type == "counter") {
		perf.label += ' (' + perf_reg.unit + '/sec)';
	} else {
		perf.label += ' (' + perf_reg.unit + ')';
	}

	perf.values = [];
	perf.series = [];

	if (this.perfs[perf_id] === undefined) {
		this.perfs[perf_id] = perf;
	}

	this.graphs[graph_id].perfs.push(perf_id);

	if (this.interval === undefined) {
		var self = this;
		this.interval = setInterval(function() {
			self.poll();
		}, this.poll_interval);
	}
}

pomngUI.panel.perf.prototype.poll = function() {

	var perf_array = [];

	for (var perf_id in this.perfs) {
		var perf = this.perfs[perf_id];
		var entry = { class: perf.class, perf: perf.name };
		if (perf.instance !== undefined)
			entry.instance = perf.instance;

		perf_array.push(entry);
	}

	if (!this.poll_request) {
		this.poll_request = pomng.call("registry.getPerfs", this.updatePerf, [ perf_array ], this);
	}

}

pomngUI.panel.perf.prototype.updatePerf = function(response, status, jqXHR) {

	var perfs = response[0];

	// Add the value for each perf
	for (var i = 0; i < perfs.length; i++) {

		var perf = perfs[i]
		var perf_id;
		var perf_type;
		if (perf.instance === undefined) {
			perf_id = 'cls_' + perf.class + '_' + perf.perf;
			perf_type = pomng.registry.classes[perf.class].performances[perf.perf].type;
		} else {
			perf_id = 'inst_' + perf.class + '_' + perf.instance + '_' + perf.perf;
			perf_type = pomng.registry.classes[perf.class].instances[perf.instance].performances[perf.perf].type;
		}
		var perf_value = { sys_time: perf.sys_time, value: perf.value };

		if (perf.pkt_time !== undefined)
			perf_value.pkt_time = perf.pkt_time;

		var sys_time = (perf.sys_time.sec * 1000) + Math.round(perf.sys_time.usec / 1000);

		// Add the value to the series
		if (this.perfs[perf_id].values.length > 1) {
			
			if (perf_type == "counter") {
				var last_id = this.perfs[perf_id].values.length - 2;
				var delta = perf.value - this.perfs[perf_id].values[last_id].value;
				this.perfs[perf_id].series.push([sys_time, delta]);
			} else {
				this.perfs[perf_id].series.push([sys_time, perf.value]);
			}
		}
		

		// Add the value to the values
		this.perfs[perf_id].values.push(perf_value);

		// Remove old entries
		while ((this.perfs[perf_id].values.length > 0) && (this.perfs[perf_id].values[0].sys_time.sec < perf.sys_time.sec - this.max_time)) {
			this.perfs[perf_id].values.splice(0,1);
		}

		while ((this.perfs[perf_id].series.length > 0) && (this.perfs[perf_id].series[0][0] < sys_time - (this.max_time * 1000))) {
			this.perfs[perf_id].series.splice(0,1);
		}
	}
	
	// Update the graphs
	for (var i = 0; i < this.graphs.length; i++) {
		this.plot(i);
	}

	delete this.poll_request;
}

pomngUI.panel.perf.prototype.addTemplateDialog = function() {

	var options = '';
	var first;
	for (var i = 0; i < this.templates.length; i++) {
		if (this.templates[i].valid !== undefined && !this.templates[i].valid())
			continue;
		options += '<option value="' + i + '">' + this.templates[i].name + '</option>';
		if (first === undefined)
			first = i;
	}

	var self = this;
	$("#dlg_perf_template_add #template").html(options).change(function() {
		self.addTemplateDialogUpdateParam($("#dlg_perf_template_add #template").val());
	});

	this.addTemplateDialogUpdateParam(first);

	$("#dlg_perf_template_add #title").val("Graph " + this.graph_count);

	$("#dlg_perf_template_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a performance graph",
		buttons: {
			Ok: function () {
				var title = pomng.htmlEscape($("#dlg_perf_template_add #title").val());
				var template_id = $("#dlg_perf_template_add #template").val();
				var template = self.templates[template_id];
				var params = [];
				if (template.params !== undefined) {
					for (var i = 0; i < template.params.length; i++) {
						var param = template.params[i];
						var value;
						var elem = $("#dlg_perf_template_add #param_" + i + " option:selected");
						if (elem.length != 0) {
							value = [];
							elem.map(function() { value.push($(this).val()); });
						} else {
							value = [ $("#dlg_perf_template_add #param_" + i).val() ];
						}
						params.push(value);
					}
				}

				var perfs = template.perfs(params);
				if (perfs.length == 0)
					return;
				
				var graph_id = self.addGraph({width: "100%", height: "200px", title: title  });
				for (var i = 0; i < perfs.length; i++) {
					self.addPerfToGraph(graph_id, perfs[i]);
				}
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	})

}

pomngUI.panel.perf.prototype.addTemplateDialogUpdateParam = function(template_id) {

	if (this.templates[template_id].params === undefined) {
		$("#dlg_perf_template_add #params").hide();
		return;
	}

	var params = '<table>';
	for (var i = 0; i < this.templates[template_id].params.length; i++) {
		var param = this.templates[template_id].params[i];
		params += '<tr><td>' + param.name + ' : </td><td>';
		
		var values = param.values();
		if (values.length == 1) {
			params += '<input type="hidden" id="param_' + i + '" value="' + values[0] + '"/>' + values[0];
		} else {
			params += '<select id="param_' + i + '"';
			if (param.type == "multiple")
				params += " multiple";
			params += '>';
			for (var j = 0; j < values.length; j++) {
				params += '<option value="' + values[j] + '">' + values[j] + '</option>';
			}
			params += '</select>';
		}

		params += '</td></tr>';
	}

	params += '</table>';

	$("#dlg_perf_template_add #params").html(params).show();
}

pomngUI.panel.perf.prototype.templates = [
	{
		name: "Input bytes per second",
		params: [ {
				name: "Input",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.input.instances).sort() }

			} ],
		valid: function () {return Object.keys(pomng.registry.classes.input.instances).length > 0},
		perfs: function (params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one input");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'input', instance: param[i], name: 'bytes_in' });
			return perfs;
		}
	},
	{
		name: "Input packets per second",
		params: [ {
				name: "Input",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.input.instances).sort() }

			} ],
		valid: function () {return Object.keys(pomng.registry.classes.input.instances).length > 0},
		perfs: function (params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one input");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'input', instance: param[i], name: 'pkts_in' });
			return perfs;
		}
	},
	{
		name: "Event processed",
		params: [ {
				name: "Event",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.event.instances).sort() }
			} ],
		perfs: function (params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one event");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'event', instance: param[i], name: 'processed' });
			return perfs;
		}
	},
	{
		name: "Protocol bytes per second",
		params: [ {
				name: "Protocol",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.proto.instances).sort() }

			} ],
		perfs: function(params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one prototocol");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'proto', instance: param[i], name: 'bytes' });
			return perfs;
		}
	},
	{
		name: "Protocol packets per second",
		params: [ {
				name: "Protocol",
				type: "multiple",
				values: function() { return Object.keys(pomng.registry.classes.proto.instances).sort() }

			} ],
		perfs: function(params) {
			var perfs = [];
			var param = params[0];
			if (param.length == 0)
				alert("You must select at least one protocol");
			for (var i = 0; i < param.length; i++)
				perfs.push({ class: 'proto', instance: param[i], name: 'pkts' });
			return perfs;
		}
	},
];


pomngUI.panel.perf.prototype.addDialog = function(perf_str) {

	var options = '<option value="-1">&lt;New graph&gt;</option>';
	for (var i = 0; i < this.graphs.length; i++) {
		options += '<option value="' + i + '">' + this.graphs[i].title + '</option>';
	}

	$("#dlg_perf_add #graph").html(options);
	$("#dlg_perf_add #graph_name input").val("");
	$("#dlg_perf_add #graph_name").show();

	$("#dlg_perf_add #graph").change(function() {
		if ($("#dlg_perf_add #graph").val() == "-1") {
			$("#dlg_perf_add #graph_name").show();
		} else {
			$("#dlg_perf_add #graph_name").hide();
		}
	});

	var self = this;

	$("#dlg_perf_add").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a performance to a graph",
		buttons: {
			Ok: function () {
				var graph_id = parseInt($("#dlg_perf_add #graph").val());
				if (graph_id == -1) {
					var name = $("#dlg_perf_add #graph_name input").val();
					if (name == "") {
						alert("You must specify a graph title");
						return;
					}
					graph_id = self.addGraph({width: "100%", height: "200px", title: name });
				}

				var perf_val = perf_str.split(".");
				var perf = {class: perf_val[0] };
				if (perf_val.length == 2) {
					perf.name = perf_val[1];
				} else {
					perf.instance = perf_val[1];
					perf.name = perf_val[2];
				}
				self.addPerfToGraph(graph_id, perf);

				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});

}

pomngUI.panel.perf.prototype.removeGraphDialog = function(graph_id) {

	var graph = this.graphs[graph_id];

	var self = this;
	pomngUI.dialog.confirm("Remove graph ?",
		"Are you sure you want to remove the graph '" + graph.title + "' ?",
		graph_id, function(graph_id) {
			self.removeGraph(graph_id);
		});
}

pomngUI.panel.perf.prototype.removePerfFromGraph = function(graph_id, perf) {
	
	var index = this.graphs[graph_id].perfs.indexOf(perf);
	this.graphs[graph_id].perfs.splice(index, 1);

	// Check if other graphs are using this perf
	for (var i = 0; i < this.graphs.length; i++) {
		var graph = this.graphs[i];
		for (j = 0; j < graph.perfs.length; j++) {
			if (graph.perfs[j] == perf)
				return;
		}
	}

	// Stop polling this perf
	delete this.perfs[perf];

	if (Object.keys(this.perfs).length == 0) {
		// No more perf to poll !
		clearInterval(this.interval);
		delete this.interval;
	}
}

pomngUI.panel.perf.prototype.removeGraph = function(graph_id) {

	var graph = this.graphs[graph_id];

	for (var i = 0; i < graph.perfs.length; i++) {
		this.removePerfFromGraph(graph_id, graph.perfs[i]);
	}

	this.graphs.splice(graph_id, 1);
	$("#" + graph.elem_id + "_container").remove();
}

pomngUI.panel.perf.prototype.graphConfig = function(graph_id) {

	var graph = this.graphs[graph_id];
	$("#dlg_perf_cfg_graph #title").val(graph.title);
	
	var perf_html = '';
	for (var i = 0; i < graph.perfs.length; i++) {
		var perf = this.perfs[graph.perfs[i]];
		perf_html += '<tr><td>' + perf.label + '</td><td><input type="checkbox" id="' + graph.perfs[i] + '"></input></td></tr>';
	}
	$("#dlg_perf_cfg_graph #perfs").html(perf_html);

	var self = this;
	$("#dlg_perf_cfg_graph").dialog({
		resizable: false,
		modal: true,
		width: "auto",
		title: "Add a performance to a graph",
		buttons: {
			Ok: function () {
				var title = $("#dlg_perf_cfg_graph #title").val();
				if (title == "") {
					alert("You must specify a graph title");
					return;
				}

				self.graphs[graph_id].title = title;
				var graph = self.graphs[graph_id];
				$("#graphs #" + graph.elem_id + "_container h4").text(title);
				for (var i = 0; i < graph.perfs.length; i++) {
					if ($("#dlg_perf_cfg_graph #" + graph.perfs[i]).prop('checked')) {
						self.removePerfFromGraph(graph_id, graph.perfs[i]);
						i--;
					}
				}
				if (!graph.perfs.length)
					self.removeGraph(graph_id);
				$(this).dialog("close");
			},
			Cancel: function() {
				$(this).dialog("close");
			}
		}
	});

}

pomngUI.panel.perf.prototype.evtRemoveInstance = function(event) {

	var cls_name = event.detail.cls_name;
	var inst_name = event.detail.instance_name;

	var perf_names = Object.keys(this.perfs);
	for (var i = 0; i < perf_names.length; i++) {
		var perf_name = perf_names[i];
		var perf = this.perfs[perf_name];
		if (perf.class == cls_name && perf.instance == inst_name) {
			for (var j = 0; j < this.graphs.length; j++) {
				var graph = this.graphs[i];
				if (graph.perfs.indexOf(perf_name) != -1) {
					this.removePerfFromGraph(j, perf_name);
				}
				if (graph.perfs.length == 0) {
					this.removeGraph(j);
					j--;
				}
			}
		}
	}
}

pomngUI.panel.perf.prototype.cleanup = function() {
	if (this.interval)
		clearInterval(this.interval)
	if (this.poll_request)
		this.poll_request.abort();
}
