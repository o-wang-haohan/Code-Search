var code = "public abs(){if(a<b){a+b;}else {a-b;}}";
var ans = "";
var i = 0;
var len = code.length;
var space = "";
for (i = 0; i < len; i++) {
    if (code[i] == ';') {
        ans = ans + ";\n";
        while (i < len - 1 && code[i + 1] == '}') {
            space = space.substring(0, space.length - 1);
            ans = ans + space + "}" + "\n";
            i += 1;
        }
        ans = ans + space;
    }
    else if (code[i] == '{') {
        space = space + "\t";
        ans = ans + "{\n" + space;
    }
    else if (code[i] == '}') {
        ans = ans + "}\n";
        if (i < len - 1 && code[i + 1] == ';') {
            ans = ans + ";";
            i += 1;
        }
        space = space.substring(0, space.length - 1);
        ans = ans + space;
    }
    else {
        ans = ans + code[i];
    }
}
console.log(ans);


{/* <div class ="form-group">
    <input type="text" 
    class ="form-control p-4 bg-light rounded rounded-pill shadow-sm mb-4" 
    id="search" 
    placeholder="Type query, hit enter, see the magic!" required>
</div> */}

{/* <script>
    function fun(){
        document.getElementById("keyword").blur()
        document.getElementById("searchPaper").blur()
        console.log("html success")
        word = $("#keyword").val()
        let url = "http://47.242.133.237:5001/search/"
        let indexData = await fetch(url+word).then(res => res.json());
        const result = indexData.result;
        console.log("html success")
        if (result.length!=0){
            vscode.postMessage({
                command: 'searchResult',
                text: result
            });
        }
    }
</script> */}

{/* <link href="${styleResultsUri}" rel="stylesheet">
<script nonce="${nonce}" src="${scriptPrettifyUri}"></script>
<script nonce="${nonce}" src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<link href="${stylePrettifyUri}" rel="stylesheet"></link> */}