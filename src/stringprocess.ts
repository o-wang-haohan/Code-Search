const code =  "public abs(){if(a<b){a+b;}else {a-b;}}";
var ans: string = "";
var i: number=0;
const len = code.length;
var space: string = "";
for(i=0;i<len;i++){
    if(code[i]==';'){
        ans = ans + ";\n" ;
        while(i<len-1&&code[i+1]=='}'){
            space = space.substring(0,space.length-1);
            ans = ans + space+"}"+"\n";
            i+=1;
        }
        ans = ans + space;
        
    }else if(code[i]=='{'){
        space = space + "\t";
        ans = ans + "{\n" +space;
    }else if(code[i]=='}'){
        ans = ans + "}\n";
        if(i<len-1 && code[i+1]==';'){
            ans = ans + ";";
            i += 1;
        }
        space = space.substring(0,space.length-1);
        ans = ans + space;
    }else{
        ans = ans + code[i];
    }
}
console.log(ans);