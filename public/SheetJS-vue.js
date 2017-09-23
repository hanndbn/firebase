var SheetJSFT = [
    "xlsx", "xlsb", "xlsm", "xls", "xml", "csv", "txt", "ods", "fods", "uos", "sylk", "dif", "dbf", "prn", "qpw", "123", "wb*", "wq*", "html", "htm"
].map(function (x) {
    return "." + x;
}).join(",");

var SJSTemplate = [
    '<div>',
    '<div v-show="showProcessing" class="loader"></div>',
    '<div class="col-12"><h6 class="alert text-success text-center">{{message}}</h6></div>',
    '<div class="col-12"><div v-html="messageError"></div></div>',
    '<div id="input-parent" style="text-align: left">',
    '<input type="file" multiple="false" id="sheetjs-input" accept="' + SheetJSFT + '" @change="onchange"/>',
    '<button type="button" id="import Data" class="btn btn-primary" data-toggle="modal " @click="showModal">Import</button>',
    '</div>',
    '<br/>',
    '<br/>',
    '<div class="modal fade" id="exampleModal" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">',
    '  <div class="modal-dialog" role="document">',
    '    <div class="modal-content">',
    '      <div class="modal-header">',
    '        <h5 class="modal-title">Import File</h5>',
    '        <button type="button" class="close" data-dismiss="modal" aria-label="Close">',
    '          <span aria-hidden="true">&times;</span>',
    '        </button>',
    '      </div>',
    '      <div class="modal-body">',
    '        <p class="text-success">Are you sure want to import this file?</p>',
    '      </div>',
    '      <div class="modal-footer">',
    '        <button type="button" class="btn btn-primary" @click="importData">Submit</button>',
    '        <button type="button" class="btn btn-secondary" id="closeBtn" data-dismiss="modal">Close</button>',
    '      </div>',
    '    </div>',
    '  </div>',
    '</div>',
    '</div>'
].join("");
var data = null;
Vue.component('html-preview', {
    template: SJSTemplate,
    methods: {
        onchange: function (evt) {
            var self = this;
            this.messageError = '';
            this.message = "Data have been read";
            this.showProcessing = false;
            var files = evt.target.files;

            if (!files || files.length == 0) return;

            var file = files[0];

            var reader = new FileReader();

            function get_header_row(sheet) {
                var headers = [];
                var range = XLSX.utils.decode_range(sheet['!ref']);
                var C, R = range.s.r;
                /* start in the first row */
                /* walk every column in the range */
                for (C = range.s.c; C <= range.e.c; ++C) {
                    var cell = sheet[XLSX.utils.encode_cell({c: C, r: R})]
                    /* find the cell in the first row */

                    var hdr = "UNKNOWN " + C; // <-- replace with your desired default
                    if (cell && cell.t) {
                        hdr = XLSX.utils.format_cell(cell);
                        headers.push(hdr);
                    }
                }
                return headers;
            }

            reader.onload = function (e) {
                // pre-process data
                var binary = "";
                var bytes = new Uint8Array(e.target.result);
                var length = bytes.byteLength;
                for (var i = 0; i < length; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                var database = {};

                /* read workbook */
                var wb = XLSX.read(binary, {type: 'binary'});

                for (var i = 0; i < wb.SheetNames.length; i++) {
                    var wsname = wb.SheetNames[i];
                    var ws = wb.Sheets[wsname];
                    var headers = get_header_row(ws);

                    /* generate HTML */
                    var array = XLSX.utils.sheet_to_json(ws);
                    var arrayOutput = [];
                    for (var j = 0; j < array.length; j++) {
                        var objectInput = array[j];
                        var objectOutput = {};
                        headers.forEach(function (header) {
                            objectOutput[header] = objectInput[header] ? objectInput[header] : "";
                        });
                        arrayOutput.push(objectOutput);
                    }
                    database[wsname] = arrayOutput;
                }
                // GET request
                self.data = JSON.stringify(database);
            };

            reader.readAsArrayBuffer(file);
        },
        showModal: function () {
            if (this.data != null) {
                $("#exampleModal").modal('show');
            } else {
                this.message = "Please choose a file!";
            }
        },
        importData: function () {
            this.showProcessing = true;
            this.message = 'processing';
            this.messageError = '';
            var self = this;
            //var formData = new FormData();
            //formData.append('xslfile', this.file);
            $.ajax({
                type: 'POST',
                url: '/importToDatabase',
                data: self.data,
                contentType: 'application/json',
                dataType: "json",
                timeout: 300000,
                success: function (data) {
                    self.message = data.result;
                    self.showProcessing = false;
                    //alert(data.status);

                },
                error: function (xhr, ajaxOptions, thrownError) {
                    self.message = xhr.status;
                    self.messageError = xhr.responseText;
                    self.showProcessing = false;
                    console.log(xhr.status);
                    console.log(thrownError);
                }
            });
            $("#closeBtn").trigger('click');
        }
    },
    data: function () {
        return {
            message: '',
            messageError: '',
            data : null,
            showProcessing : false
        }
    }
});
