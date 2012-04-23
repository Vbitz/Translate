var fs = require("fs");

currentLanguage = "";

header = [
];

flags = {};

nativeCalls = {
	"cpp": {
		"println": function (block, parent) {
			if (flags["iostream_include"] === undefined) {
				flags["iostream_include"] = true;
				header.push("#include <iostream>");
			}
			return "std::cout << " + getValue(block.args[0]) + " << std::endl;";
		}
	}
};

valueTypes = {
	"cpp": {
		"string": function (block, parent) {
			if (flags["string_include"] === undefined) {
				flags["string_include"] = true;
				header.push("#include <string>");
			}
			return "std::string";
		}
	}
};

function cpp_parseClass(block, parent) {
	str = "";
	for (var sname in block.members) {
		item = block.members[sname];
		str += methods[currentLanguage][item.type](item, block, {name: sname});
	}
	return str;
}

methods = {
	"cpp": {
		"class": function (block, parent, args) {
			str = "";
			if (block.transperent) {
				str += cpp_parseClass(block, parent);
			} else {
				if (block.namespace !== undefined) {
					str += "namespace " + block.namespace.replace(".", "::") + " {";
				}
				str += "class " + block.name + "{";
				str += cpp_parseClass(block, parent);
				str += "}";
				if (block.namespace !== undefined) {
					str += "}";
				}
			}
			return str;
		},

		"const": function (block, parent, args) {
			return "\"" + block.value + "\"";
		},

		"field": function (block, parent, args) {
			str = valueTypes["cpp"][block.value.valueType](block, parent) + " " + args.name + " = \"" + block.value.value + "\";";
			return str;
		},

		"method": function (block, parent, args) {
			str = "";
			if (block.entry !== undefined) {
				str += "int main(int argc, char* argv[]) {";
			} else {
				str += block.returnType + " " + args.name + "(";
				for (var i = 0; i < block.args.length; i++) {
					str += valueTypes[currentLanguage][block.args[i].valueType](null, null) + " " + block.args[i].valueName;
					if (i < block.args.length - 1) {
						str += ", ";
					}
				}
				str += ") {";
			}
			for (var item in block.code) {
				str += methods[currentLanguage][block.code[item].type](block.code[item], block);
			}
			str += "}";
			return str;
		},

		"getConst": function (block, parent, args) {
			return block.value;
		},

		"nativeCall": function (block, parent, args) {
			return nativeCalls["cpp"][block.method](block, parent);
		},

		"return": function (block, parent, args) {
			if (block.value === undefined) {
				return "return 0;";
			} else {
				return "return " + getValue(block.value) + ";";
			}
		}
	}
};

function getValue(block) {
	return methods[currentLanguage][block.type](block, null);
}

function compileCode (filename, language, callback) {
	currentLanguage = language;
	retString = "";
	fs.readFile(filename, "utf8", function (err, str) {
		jsonData = JSON.parse(str);
		for (var i = 0; i < jsonData.length; i++) {
			item = jsonData[i];
			retString = retString + methods[currentLanguage][item.type](item, null, {});
		}
		header.push("");
		callback(header.join('\n') + retString);
	});
}
compileCode("testing.json", "cpp", console.log);