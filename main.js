var body=document.querySelectorAll("body");

var mainLog=document.querySelectorAll("span.main-log");

var grammar={};
var grammarTextArea=document.querySelectorAll('textarea.grammar');
var codeTextArea=document.querySelectorAll('textarea.code');
var table=[];
var stack=[];
var code;
var codeLines;
var pointer=-1;
var currentToken='';
var symbols_extracted=[];

var startTime;
var endTime;

var parseLogStr='';
var parseErrStr='';

var readUntil='$';

var seperators=[' ','\n','\t','(',')','.','..','[',']',',',':',';','+','-','*','/','<','>','=','<=','>=','!=',':=','//','/*','*/'];

var seperatorsMaxLength;

var columns=document.querySelectorAll('div.col');
var mainButtons=document.querySelectorAll('div.main button');
var log=document.querySelectorAll('div.col div.log');
var firstFollowTable=document.querySelectorAll('div.col div.tables.first-follow');
var LL1TableCells;
var LL1Table=document.querySelectorAll('div.col div.tables.ll1');
var symbolTable=document.querySelectorAll('div.col div.tables.symbols');
var stackSVG=document.querySelectorAll('div.col div.svg-container svg.stack');
var stackSVGContainer=document.querySelectorAll('div.col div.svg-container');
var animationRatio=50;
var stackShape=document.createElementNS("http://www.w3.org/2000/svg","path");
stackShape.setAttribute("d","m 14900 50 l -14800 0 l 0 100 l 14800 0");
stackShape.setAttribute("stroke","rgb(180,140,140)");
stackShape.setAttribute("fill","transparent");
stackShape.setAttribute("stroke-width","4");
stackShape.style.strokeDasharray='0 100000';
var currentTokenTitle;
var currentTokenLetters=[];
var animatedStack=[];

var animate=false;
var animationControl=document.querySelectorAll('div.animation-control');
var animationControlButtons=document.querySelectorAll('div.animation-control button');
var ratioSpan=document.querySelectorAll('div.animation-control div.options span.ratio');
var ratioButton=document.querySelectorAll('div.animation-control div.options span.ratio button');
var ratioMeeleContainer=document.querySelectorAll('div.animation-control div.options span.ratio span.container');
var trackMouse=false;
var optionButtonImg=document.querySelectorAll('div.animation-control div.options span.buttons button img');
var animationTraceSpan=document.querySelectorAll('div.animation-control div.trace span.played');
var animationPaused=false;
var animationDuration=0;

seperatorsMaxLength=getSeperatorsMaxLength();


$(window).click(function()
{
  hideMainLog();
});


window.onerror=function myErrorHandler(errorMsg, url, lineNumber) {
	var log='';
    log+="<p class='err'><span class='title'>Grammar Error: </span>Unknown Error Occurred; This Might Be Caused By Invalid LL 1 Grammar</p>";
    writeInLog(log);
    return false;
}


window.onmouseup=function(event){
	trackMouse=false;
}


ratioMeeleContainer[0].onmousemove=function(event) {
	if(trackMouse)
	{
		var e=event.toElement || event.relatedTarget;
		if(e==ratioButton[0])
		{			
			return;
		}
		var left=event.clientX-ratioMeeleContainer[0].offsetLeft-ratioSpan[0].offsetLeft;
		ratioButton[0].style.left=left+'px';
		animationRatio=(1-left/ratioMeeleContainer[0].offsetWidth)*100;
	}
}


ratioButton[0].onmousedown=function(event){
	trackMouse=true;
};


function showMainLog(log,color='darkred',bgc='rgba(180,130,130,0.95)')
{
   setTimeout(function(){
      mainLog[0].style.top='0px';
      mainLog[0].innerHTML=log;
      mainLog[0].style.backgroundColor=bgc;
      mainLog[0].style.color=color;
   },5*animationRatio);
}

function hideMainLog()
{
  if(getComputedStyle(mainLog[0],null).top.match(/[0-9]+/)=='0')
  {
     mainLog[0].style.top='-50px';
     setTimeout(function(){
       mainLog[0].style.top='-500px';
     },1*animationRatio);
  }
}


function addMemberToSet(member,toSet)
{
	var repeated=false;
	toSet.forEach(function(token){
		if(token===member)
		{
			repeated=true;
		}
	});	
	if(repeated)
	{
		return toSet;
	}
	toSet.push(member);
	return toSet;
}


function addSetToSet(set,toSet)
{
	set.forEach(function(token){
		toSet=addMemberToSet(token,toSet);
	});
	return toSet;
}




function setGrammarObject(grammarStr)
{
	grammar={};
	var counter=1;
	grammar.variables=[];
	grammar.terminals=['$'];
	var lines=grammarStr.split("\n"); 
	lines.forEach(function(line){
		var variable=line.split('->')[0].trim();

		var definition=line.substr(line.indexOf('->')+2);
		var definitionParts=definition.split('|');
		var partIndexes=[];
		definitionParts.forEach(function(part){
			var definitionPartTokens=part.split(' ');
			var tokens=[];
			definitionPartTokens.forEach(function(token){
				if(token.trim()=='')
				{
					return;
				}
				tokens.push({str:token,isVar:false});
			});		
			grammar[counter]={str:part,tokens:tokens,variable:variable};
			partIndexes.push(counter);
			counter++;	
		});
		grammar[variable]={str:definition,parts:partIndexes,first:[],follow:[]};
		grammar.variables.push(variable);
	});	
	grammar.count=counter-1;

	for(var i=1;i<counter;i++)
	{
		for(var ii=0;ii<grammar[i].tokens.length;ii++)
		{
			if(isMemberInSet(grammar[i].tokens[ii].str,grammar.variables))
			{
				grammar[i].tokens[ii].isVar=true;
			}else{
				if(grammar[i].tokens[ii].str!='%')
				{
					addMemberToSet(grammar[i].tokens[ii].str,grammar.terminals);
				}			
			}
		}
	}	
}




function setFirstFollow()
{		
	grammar.variables.forEach(function(variable){			
		grammar[variable].first=getFirst(variable);
		grammar[variable].follow=getFollow(variable,variable,true);		
	});
}


function logFirstFollow()
{
	var log='<table class="first-follow">';
	log+='<tr><th style="border-bottom:5px solid rgb(180,140,140);border-right:5px solid rgb(180,140,140);"/>';
	grammar.variables.forEach(function(nonTerminal){
		log+='<th style="border-bottom:5px solid rgb(180,140,140);">'+nonTerminal+'</th>';
	});
	log+='</tr>';

	log+='<tr>';
	log+='<th style="border-right:5px solid rgb(180,140,140);">first</th>';
	grammar.variables.forEach(function(nonTerminal){
		log+='<td>'+grammar[nonTerminal].first.join("&nbsp;&nbsp;")+'</td>';
	});
	log+='</tr>';

	log+='<tr>';
	log+='<th style="border-right:5px solid rgb(180,140,140);">follow</th>';
	grammar.variables.forEach(function(nonTerminal){
		log+='<td>'+grammar[nonTerminal].follow.join("&nbsp;&nbsp;")+'</td>';
	});
	log+='</tr>';
	
	log+='</table>';

	firstFollowTable[0].innerHTML=log;

}


function getFirst(variable)
{
	var set=[];
	grammar[variable].parts.forEach(function(part){
		for(var i=0;i<grammar[part].tokens.length;i++)
		{
			var token=grammar[part].tokens[i];
			if(!token.isVar)
			{	
				addMemberToSet(token.str,set);
				break;
			}else{
				var firsts=getFirst(token.str);
				if(firsts[firsts.length-1]=='%')
				{
					if(i!=grammar[part].tokens.length-1)
					{
						firsts.splice(firsts.length-1,1);
					}
					addSetToSet(firsts,set);
					break;
				}else{
					addSetToSet(firsts,set);
					break;
				}
			}
		}
	});
	return set;
}




function getFollow(variable,startVar,isFirst)
{
	var set=[];

	if(variable==startVar && !isFirst)
	{
		return set;
	}		

	if(isStartingGrammer(variable))
	{
		set=['$'];
	}
	for(var i=1;i<=grammar.count;i++)
	{
		var thisGrammar=grammar[i];
		var found=false;
		for(var ii=0;ii<thisGrammar.tokens.length;ii++)
		{
			var token=thisGrammar.tokens[ii];
			if(token.str===variable)
			{
				found=true;
				if(ii==thisGrammar.tokens.length-1 && thisGrammar.variable!=token.str)
				{	
					addSetToSet(getFollow(thisGrammar.variable,startVar,false),set);
				}
				continue;				
			}
			if(found)
			{
				if(!token.isVar)
				{
					addMemberToSet(token.str,set);
					break;
				}else{ 
					var first=getFirst(token.str);
					if(first[first.length-1]=='%')
					{
						if(ii==thisGrammar.tokens.length-1)
						{
							addSetToSet(getFollow(thisGrammar.variable,startVar,false),set);
						}
						first.splice(first.length-1,1);	
						addSetToSet(first,set);			
					}else{
						addSetToSet(first,set);
						break;
					}
					
				}
			}
		}
	}
	return set;
}




function isStartingGrammer(variable)
{
	if(grammar[1].variable==variable)
	{
		return true;
	}
	return false;
}



function createTable()
{
	var log='';	
	parseErrStr='';
	grammar.variables.forEach(function(nonTerminal){
		table[nonTerminal]=[];
		grammar.terminals.forEach(function(terminal){	
			if(isMemberInSet(terminal,grammar[nonTerminal].first))
			{
				var partIndexes=getFirstIndex(terminal,nonTerminal);
				if(partIndexes.length==1)
				{
					table[nonTerminal][terminal]=partIndexes[0];
				}else{ 					
					parseErrStr+="<p class='err'><span class='title'>Grammar Error: </span>Invalid LL 1 Grammar In Grammer Variable "+nonTerminal+"</p>";
					return -1;
				}				
			}else if(isMemberInSet(terminal,grammar[nonTerminal].follow)){
				if(isMemberInSet('%',grammar[nonTerminal].first))
				{
					var partIndexes=getFirstIndex('%',nonTerminal);
					if(partIndexes.length==1)
					{
						table[nonTerminal][terminal]=partIndexes[0];
					}else{ 
						parseErrStr+="<p class='err'><span class='title'>Grammar Error: </span>Invalid LL 1 Grammar In Grammer Variable "+nonTerminal+"</p>";
						return -1;
					}	
				}else{
					table[nonTerminal][terminal]='sync';	
				}
				
			}else{
				table[nonTerminal][terminal]=null;
			}			
		});
	});

}



function getFirstIndex(first,variable)
{
	var set=[];
	for(var i=0;i<grammar[variable].parts.length;i++)
	{
		var part=grammar[variable].parts[i];
		for(var ii=0;ii<grammar[part].tokens.length;ii++)
		{
			var token=grammar[part].tokens[ii];
			if(!token.isVar)
			{	
				if(token.str==first)
				{
					addMemberToSet(i+grammar[variable].parts[0],set);
				}
				break;
			}else{
				var firsts=getFirst(token.str);
				if(firsts.indexOf(first)!=-1)
				{	
					addMemberToSet(i+grammar[variable].parts[0],set);
				}
				break;
			}
		}
	}
	
	if(set.length)
	{
		return set;
	}

	return false
}



function logTable()
{
	var log='<table class="ll1">';
	log+='<tr><th style="border-bottom:5px solid rgb(180,140,140);border-right:5px solid rgb(180,140,140);"/>';
	grammar.terminals.forEach(function(terminal){
		log+='<th style="border-bottom:5px solid rgb(180,140,140);">'+terminal+'</th>';
	});
	log+='</tr>';
	grammar.variables.forEach(function(nonTerminal){
		log+='<tr><th style="border-right:5px solid rgb(180,140,140);">'+nonTerminal+'</th>';
		grammar.terminals.forEach(function(terminal){
			log+='<td>'+table[nonTerminal][terminal]+'</td>';
		});
		log+='</tr>';
	});
	log+='</table>';

	LL1Table[0].innerHTML=log;

	LL1TableCells=document.querySelectorAll('div.col div.tables.ll1 table td');
}


function getPartIndex(searchToken,variable)
{
	var set=[];
	var parts=grammar[variable].parts;
	for(var i=0;i<parts.length;i++)
	{
		grammar[parts[i]].tokens.forEach(function(token){
			if(token.str==searchToken)
			{
				addMemberToSet(i,set);
			}
		});
	}
	if(set.length)
	{
		return set;
	}

	return false;
}

function isMemberInSet(member,inSet)
{
	var found=false;
	inSet.forEach(function(setMember){
		if(setMember==member)
		{
			found=true;
		}
	});

	return found;
}


function isSetInSet(set,inSet)
{
	var match=true;
	set.forEach(function(setMember){
		if(!isMemberInSet(setMember,inSet))
		{
			match=false;
		}
	});

	return match;
}





function writeInLog(str)
{ 
	if(log[0].innerHTML!='')
	{
		log[0].innerHTML+='';
		var scrollHeight=log[0].scrollHeight;
	}
	
	log[0].innerHTML+=str;

	if(scrollHeight)
	{
		log[0].scrollTo(0,scrollHeight);	
	}
}



function getNextToken()
{	
	currentToken='';
	var tokenIsString=false;
	while(1)
	{	
		if(pointer==code.length-1)
		{
			break;
		}
		pointer++;

		currentToken+=code[pointer];			
				


		if(readUntil!='$')
		{
			if(currentToken.indexOf(readUntil)!=-1)
			{				
				if(readUntil=='"' || readUntil=="'")
				{
					readUntil='$';
					tokenIsString=true;
					break;
				}
				readUntil='$';
				currentToken='';				
			}			
			continue;		
		}
				

		if(currentToken.trim()=='' || currentToken=='\n')
		{
			currentToken='';
			continue;
		}
		var seperatorMatch=checkIfStrReached(seperators);
		if(seperatorMatch!==false)
		{
			currentToken=currentToken.substr(0,currentToken.indexOf(seperatorMatch));		
			if(currentToken=='')
			{
				if(seperatorMatch=='"')
				{
					readUntil='"';
					continue;
				}

				if(seperatorMatch=="'")
				{
					readUntil="'";
					continue;
				}

				if(seperatorMatch=='//')
				{
					readUntil='\n';
					continue;
				}

				if(seperatorMatch=='/*')
				{
					readUntil='*/';
					continue;
				}
				currentToken=seperatorMatch;				
			}else{
				pointer=pointer-seperatorMatch.length;
			}
			break;
		}	
	}



	if(pointer==code.length-1 && currentToken!=readUntil)
	{   
		logSyntaxError('end');
		return false;
	}

	
	if(!isMemberInSet(currentToken,grammar.terminals) && /^[a-zA-Z][a-zA-Z0-9]*$/.test(currentToken) && !/[^a-zA-Z0-9]/.test(currentToken))
	{
		currentToken='id';
	}

	if(!/[^0-9-]/.test(currentToken))
	{
		currentToken='num';
	}

	if(tokenIsString)
	{
		currentToken='string';
	}


	if(!checkToken(currentToken))
	{
		logSyntaxError('token');
		return false;
	}
	goToStackBottom();
	animatedTokenRead(currentToken);
	goToStackTop();

	return true;
}

function getSeperatorsMaxLength()
{
	var max=1;
	seperators.forEach(function(item){
		if(item.length>max)
		{
			max=item.length;
		}
	});
	return max;
}


function checkIfStrReached(set)
{
	returnVal='';
	for(var i=0;i<set.length;i++)
	{
		var indexOfStr=currentToken.indexOf(set[i]);
		if(indexOfStr!=-1 && (indexOfStr+set[i].length)==currentToken.length)
		{		
			if(set[i].length>returnVal.length)
			{
				returnVal=set[i];
			}
		}
	}
	if(returnVal=='')
	{
		return false;
	}
	for(var i=0;i<set.length;i++)
	{
		if(set[i].indexOf(returnVal+code[pointer+1])===0)
		{		
			return false;
		}
	}
	return returnVal;
}


function checkToken(token)
{
	if(!isMemberInSet(token,grammar.terminals))
	{
		return false;
	}
	return true;
}



function createSymbolTable()
{
	symbols_extracted=[];
	var functions;
	var procedures;
	var variables;
	var arrays	
	var type;
	var thisCodeLines=codeTextArea[0].value.split("\n");

	for(var i=0;i<thisCodeLines.length;i++)
	{
		var codeLine=thisCodeLines[i];
		functions=codeLine.match(/function[ ]*[a-zA-Z0-9]+[ ]*(?:(?::[ ]*(?:integer|string|real))|(?:\([ ]*.*\)[ ]*:[ ]*(?:integer|string|real)))/g) || [];
		procedures=codeLine.match(/procedure[ ]*[a-zA-Z0-9]+[ ]*/g) || [];
		variables=codeLine.match(/[ ]*(?:[a-zA-Z0-9][ ]*[,]*[ ]*)+[ ]*:[ ]*(?:integer|string|real)/g) || [];
		arrays=codeLine.match(/(?:[a-zA-Z0-9][ ]*[,]*[ ]*)+[ ]*:[ ]*array[ ]*\[[ ]*[0-9]+[ ]*..[ ]*[0-9]+[ ]*\][ ]*of[ ]*(?:integer|string|real)/g) || [];	
		for(var ii=0;ii<functions.length;ii++)
		{
			item=functions[ii];
			item=item.trim().replace(/^function[ ]*/g,'');
			type=item.replace(/[a-zA-Z0-9]+[ ]*(?:(?::[ ]*)|(?:\([ ]*.*\)[ ]*:[ ]*))/,'').trim(1);		
			item=item.replace(/[ ]*(?:(?::[ ]*(?:integer|string|real))|(?:\([ ]*.*\)[ ]*:[ ]*(?:integer|string|real)))/g,'');		
			symbols_extracted.push({str:item.trim(),varType:type,type:'function',line:i+1});
		}
		for(var ii=0;ii<procedures.length;ii++)
		{
			item=procedures[ii];
			item=item.trim().replace(/^procedure[ ]*/g,'');
			type=null;		
			symbols_extracted.push({str:item.trim(),varType:type,type:'procedure',line:i+1});
		}
		for(var ii=0;ii<variables.length;ii++)
		{
			item=variables[ii];
			if(item.trim().match(/^function/g))
			{
				continue;
			}
			item=item.trim().replace(/^var /g,'');
			type=item.replace(/(?:[a-zA-Z0-9][ ]*[,]*[ ]*)+[ ]*:[ ]*/,'').trim(1);		
			item=item.replace(/:[ ]*(?:integer|string|real)/g,'');		
			item.split(',').forEach(function(variable){
				symbols_extracted.push({str:variable.trim(),varType:type,type:'variable',line:i+1});
			});
		}
		for(var ii=0;ii<arrays.length;ii++)
		{
			item=arrays[ii];
			item=item.trim().replace(/var /g,'');
			type=item.replace(/(?:[a-zA-Z0-9][ ]*[,]*[ ]*)+[ ]*:[ ]*array[ ]*\[[ ]*[0-9]+[ ]*..[ ]*[0-9]+[ ]*\][ ]*of[ ]*/g,'').trim(1);		
			item=item.replace(/[ ]*:[ ]*array[ ]*\[[ ]*[0-9]+[ ]*..[ ]*[0-9]+[ ]*\][ ]*of[ ]*(?:integer|string|real)/g,'');				
			item.split(',').forEach(function(variable){
				symbols_extracted.push({str:variable.trim(),varType:type,type:'array',line:i+1});
			});
		}
	}
}


function logSymbolTable()
{
	var log='<table class="symbol">';
	log+='<tr>';
	log+='<th style="border-right:5px solid rgb(180,140,140);border-bottom:5px solid rgb(180,140,140);">Name</th>';
	log+='<th style="border:5px solid rgb(180,140,140);border-top:none;">Type</th>';
	log+='<th style="border:5px solid rgb(180,140,140);border-top:none;">VarType</th>';
	log+='<th style="border-left:5px solid rgb(180,140,140);border-bottom:5px solid rgb(180,140,140);">Line</th>';
	log+='</tr>';
	symbols_extracted.forEach(function(item){
		log+='<tr>';
		log+='<td style="border-right:5px solid rgb(180,140,140);">'+item.str+'</td>';
		log+='<td style="border-right:5px solid rgb(180,140,140);border-left:5px solid rgb(180,140,140);">'+item.type+'</td>';
		log+='<td style="border-right:5px solid rgb(180,140,140);border-left:5px solid rgb(180,140,140);">'+item.varType+'</td>';
		log+='<td style="border-left:5px solid rgb(180,140,140);"> '+item.line+'</td>';
		log+='</tr>';
	});
	log+='</table>';

	symbolTable[0].innerHTML=log;
}



function drawSymbolTableButton()
{
	createSymbolTable();
	logSymbolTable();
}
mainButtons[5].onclick=function(){
	drawSymbolTableButton();
};




function clearLog()
{
	log[0].innerHTML='';
}

mainButtons[2].onclick=function(){
	clearLog();
};


function parse(isAnimated)
{	
	clearLog();
	animate=isAnimated;
	var log='';

	stack=[];
	pointer=-1;
	parseLogStr='';	
	readUntil='$';
	code=codeTextArea[0].value.trim()+' $';
	codeLines=codeTextArea[0].value.trim().split("\n");

	mainStackPush('$');
	mainStackPush(grammar[1].variable);

	parseStarted();

	if(getNextToken()===false)
	{		
		return parseFinished(false);
	}


	var error=false;
	var stackTop=stack[stack.length-1];

	while(1)
	{	
		logParseState();
		stackTop=stack[stack.length-1];
		if(isMemberInSet(stackTop,grammar.terminals))
		{
			if(stackTop==currentToken)
			{
				if(stackTop=='$')
				{
					break;
				}
				mainStackPop();
				if(getNextToken()===false)
				{			
					return parseFinished(false);
				}
				continue;
			}else{ 
				error=true;				
				throwErrors('token');
				mainStackPop();
				if(!stack.length)
				{
					break;
				}
								
				continue;
			}
		}else{
			animatedTableCheck(currentToken,stackTop);
			goToStackTop();
			var tableCell=table[stackTop][currentToken];
			var breakWhile=false;
			switch(tableCell)
			{
				case null:
					error=true;
					throwErrors('null');
					if(pointer==code.length-1)
					{
						breakWhile=true;
						break;
					}
					if(getNextToken()===false)
					{		
						return parseFinished(false);
					}
					continue;
				break;
				case 'sync':
					var nonterminalsCount=0;
					stack.forEach(function(item){
						if(isMemberInSet(item,grammar.variables))
						{
							nonterminalsCount++;
						}
					});
					if(nonterminalsCount>1)
					{
						error=true;
						throwErrors('sync');
						mainStackPop();	
						if(!stack.length)
						{
							breakWhile=true;
							break;
						}								
					}else{
						if(pointer==code.length-1)
						{
							breakWhile=true;
							break;
						}
						if(getNextToken()===false)
						{	
							return parseFinished(false);
						}
						continue;	
					}
				break;
				default:
					var newTokens=grammar[tableCell].tokens;
					mainStackPop();
					if(newTokens[0].str!='%')
					{
						for(var i=newTokens.length-1;i>=0;i--)
						{	
							mainStackPush(newTokens[i].str);
						}
					}
					
				break;
			}
			if(breakWhile)
			{
				break;
			}
		}
	}

	return parseFinished(!error);
}



function parseStarted()
{
	startTime=Date.now();
	writeInLog("<p style='color:rgb(160,180,160);'>---Parsing Started---</p>");
}

function parseFinished(success)
{
	endTime=Date.now();
	var log='';
	if(!success)
	{
		writeInLog(parseLogStr);
		writeInLog(parseErrStr);		
		log+="<p class='failure'>Compile Failed</p>";
		log+="<p style='color:rgb(180,160,160);'>---Parsing Finished (took "+(endTime-startTime)+"ms)---</p>";
		writeInLog(log);		
		return false;
	}else{
		writeInLog(parseLogStr);
		writeInLog(parseErrStr);		
		log+="<p class='success'>Accepted!</p>";
		log+="<p style='color:rgb(180,160,160);'>---Parsing Finished (took "+(endTime-startTime)+"ms)---</p>";
		writeInLog(log);
		return true;
	}
}

function mainStackPush(variable)
{
	stack.push(variable);
	pushAnimatedStack(variable);
}


function mainStackPop()
{
	stack.pop();
	popAnimatedStack();
}


function logParseState()
{
	var position=getPosition();
	var log='';
	log+='<BR><BR>';
	log+='<span style="color:rgb(160,140,140);">Line: </span><span style="color:rgb(130,185,195);">'+position.line+"</span>";
	log+='<BR><span style="color:rgb(160,140,140);">Character Number: </span><span style="color:rgb(130,185,195);">'+position.char+"</span>";
	log+='<BR><span style="color:rgb(160,140,140);">Pointer: </span><span style="color:rgb(130,185,195);">'+pointer+"</span>";
	log+='<BR><span style="color:rgb(160,140,140);">Token: </span><span style="color:rgb(130,185,195);">'+currentToken+"</span>";
	log+='<table class="stack">';
	log+="<tr>";
	stack.forEach(function(item){
		log+="<td>"+item+"</td>";
	});	
	log+="<tr>";
	log+='</table>';
	parseLogStr+=log;
}


function throwErrors(errCode)
{
	var log='';
	if(isMemberInSet(stack[stack.length-1],grammar.variables))
	{
		
		var first=[];
		grammar[stack[stack.length-1]].first.forEach(function(item){
			if(item=='%')
			{
				return;
			}
			first.push(item);
		});
	}
	var position=getPosition();
	switch(errCode)
	{
		case 'sync':
			log+="<p class='err'><span class='title'>Parse Error: </span>Unexpected Token '"+currentToken+"' Expecting '"+first.join("'' or '")+"' In Line "+(position.line)+",Character Number  "+(position.char)+"</p>";
		break;
		case 'null':
			log+="<p class='err'><span class='title'>Parse Error: </span>Unexpected Token '"+currentToken+"' Expecting '"+first.join("'' or '")+"' In Line "+(position.line)+",Character Number  "+(position.char)+"</p>";
		break;
		case 'token':
			log+="<p class='err'><span class='title'>Parse Error: </span>Unexpected Token '"+currentToken+"' Expecting '"+stack[stack.length-1]+"' In Line "+(position.line)+",Character Number  "+(position.char)+"</p>";
		break;
	}
	parseErrStr+=log;
}


function logSyntaxError(errCode)
{
	var position=getPosition();
	var log='';
	switch(errCode)
	{
		case 'token':
			log+="<p class='err'><span class='title'>Syntax Error: </span>Unknown Token '"+currentToken+"' In Line "+(position.line)+",Character Number  "+(position.char)+"</p>";	
		break;
		case 'end':
			log+="<p class='err'><span class='title'>Syntax Error: </span>Invalid End Of Code</p>";	
		break;
	}
	parseErrStr+=log;
}






function smoothScroll(top,left)
{
	window.scrollTo({
		top:top,
		left:left,
		behavior:'smooth'
	})
}


function smoothScrollElement(element,top,left)
{
	element.scrollTo({
		top:top,
		left:left,
		behavior:'smooth'
	})
}


var taskManager={
	stack:[],
	currentTask:{},
	timeout:{},
	finished:true,
	push:function(task,wait){	
			taskManager.stack.push({task:task,wait:wait});
		},	
	pause:function(){
			clearTimeout(taskManager.timeout);
			taskManager.stack.splice(0,0,taskManager.currentTask);
		},	
	handler:function(){		    
			if(!taskManager.stack.length)
			{
				taskManager.finished=true;
				stopAnimation();
				return;
			}
			taskManager.finished=false;
					
			taskManager.currentTask=taskManager.stack[0];
			taskManager.stack.splice(0,1);
			taskManager.timeout=setTimeout(function(){	
				updatePlayedBar();		
				taskManager.currentTask.task();
				taskManager.handler();
			},taskManager.currentTask.wait*(animationRatio/100));
		},
	reset:function(){		    
			taskManager.stack=[];
			taskManager.currentTask={};
			taskManager.timeout={};
			taskManager.finished=true;
	}
}




function elementBasedWindowScroll(jQueryElement,base,to)
{
  if(to==null)
  {
   to=0;
  }
  switch(base)
  {
    case 'top':
      base=jQueryElement.offset().top;
    break;
    case 'bottom':
      base=jQueryElement.offset().top+jQueryElement.innerHeight();
    break;
  }
  smoothScroll(base+to,0);
}




function parseAnimation()
{
	taskManager.reset();
	taskManager.push(function(){
		setGrammarObject(grammarTextArea[0].value.trim());
		setFirstFollow();		
		createTable();		
		elementBasedWindowScroll($(columns[3]),'top',-5);
	},0);
	taskManager.push(function(){
		logFirstFollow();
	},1000);
	taskManager.push(function(){
		elementBasedWindowScroll($(columns[4]),'top',-5);
	},2000);
	taskManager.push(function(){
		logTable();
		stackSVG[0].appendChild(stackShape);
		drawElement(stackShape,150,0,stackShape.getTotalLength(),900);
	},1000);
	taskManager.push(function(){
		elementBasedWindowScroll($(columns[5]),'top',-5);
	},2000);


	taskManager.push(function(){
		currentTokenTitle=document.createElementNS("http://www.w3.org/2000/svg","text");
		currentTokenTitle.setAttribute("fill","rgb(130,185,195)");  ;
	    currentTokenTitle.setAttribute("font-size","22");
	    currentTokenTitle.setAttribute("font-weight","bold");
	    currentTokenTitle.setAttribute("font-family","jannat");
	    currentTokenTitle.setAttribute("dy","3");
	    currentTokenTitle.setAttribute("y",-100);
	    currentTokenTitle.setAttribute("x",10);
	    currentTokenTitle.setAttribute("alignment-baseline","right");
	    currentTokenTitle.innerHTML='current token: ';
	    stackSVG[0].appendChild(currentTokenTitle);	    
	},0);
	taskManager.push(function(){
	    currentTokenTitle.setAttribute("transform","translate(0,120)");
	},2000);
	

	taskManager.handler();
}


function drawElement(element,pace,start,end,step)
{
  var length=start;
  if(((length+step)<=end && (start-end)<0) || ((length+step)>=end && (start-end)>0))
  {
    length+=step;
  }else{
    element.style.strokeDasharray=(end).toString()+" 10000";
    return;
  }
  element.style.strokeDasharray=length.toString()+" 10000";
  var drawInterval=setInterval(function(){
    if(((length+step)<=end && (start-end)<0) || ((length+step)>=end && (start-end)>0))
    {
      length+=step;
    }else{
      element.style.strokeDasharray=(end).toString()+" 10000";
      clearInterval(drawInterval);
      return;
    }
    element.style.strokeDasharray=length.toString()+" 10000";
  },(pace/100)*animationRatio);
}



function createTokenText(text)
{
	taskManager.push(function(){
		currentTokenLetters=[];
	},0);
	for(var i=0;i<text.length;i++)
	{
		createTokenLetter(text[i]);
	}	
	taskManager.push(function(){		
	},2000);
}

function createTokenLetter(chr)
{
	taskManager.push(function(){
		var token;	
		token=document.createElementNS("http://www.w3.org/2000/svg","text");
		token.setAttribute("fill","rgb(140,200,140)");  ;
	    token.setAttribute("font-size","20");
	    token.setAttribute("font-family","jannat");
	    token.setAttribute("dy","3");
	    token.setAttribute("y",-100);
	    token.setAttribute("x",2000);
	    token.setAttribute("alignment-baseline","right");
	    token.innerHTML=chr;
	    stackSVG[0].appendChild(token);	     
		var x=currentTokenTitle.getBBox().width+15;
		for(var i=0;i<currentTokenLetters.length;i++)
		{
			x+=currentTokenLetters[i].getBBox().width;				
		}
	
	    token.setAttribute("transform","translate(-"+(2000-x)+",120)");
	
		currentTokenLetters.push(token);	
	},100);
}


function dropTokenText()
{     	
	taskManager.push(function(){		
	    for(var i=0;i<currentTokenLetters.length;i++)
	    {
	    	var chr=currentTokenLetters[i];
	    	var x=currentTokenTitle.getBBox().width+15;
			for(var ii=0;ii<i;ii++)
			{
				x+=currentTokenLetters[ii].getBBox().width;				
			}
			chr.setAttribute("transform","translate(-"+(2000-x)+",0)");
		}
	},1000);
	taskManager.push(function(){		
	    for(var i=0;i<currentTokenLetters.length;i++)
	    {
	    	stackSVG[0].removeChild(currentTokenLetters[i]);	    	
		}
		currentTokenLetters=[];
	},1000);
}


function goToLogBottom()
{
	elementBasedWindowScroll($(columns[2]),'top',-5);
	smoothScrollElement(log[0],log[0].scrollHeight,0);
}

function goToFFTableCell(tableTerminal,tableNonTerminal)
{
	taskManager.push(function(){		
	    elementBasedWindowScroll($(columns[4]),'top',-5);
	},0);
	taskManager.push(function(){		
	    smoothScrollElement(LL1Table[0],0,0);
	},200);
	taskManager.push(function(){	
		var LL1TableColCount=grammar.terminals.length;
	    var x=-20;
	    for(var i=0;i<LL1TableColCount && grammar.terminals[i]!=tableTerminal;i++)
	    {
	    	x+=LL1TableCells[i].offsetWidth;
	    }
	    x+=LL1TableCells[i].offsetWidth;
	    var col=i;
	    var y=0;
	    for(var i=0;i<grammar.variables.length && grammar.variables[i]!=tableNonTerminal;i++)
	    {
	    	y+=LL1TableCells[i*LL1TableColCount+col].offsetHeight;
	    }
	    y+=LL1TableCells[i*LL1TableColCount+col].offsetHeight;
	    var row=i;
	    smoothScrollElement(LL1Table[0],y,x);
	    setTimeout(function(){
	    	LL1TableCells[col+row*LL1TableColCount].style.backgroundColor='rgb(120,140,120)';
	    },1000*(animationRatio/100));
	    setTimeout(function(){
	    	LL1TableCells[col+row*LL1TableColCount].style.backgroundColor='transparent';
	    },1800*(animationRatio/100));
	},1200);
	taskManager.push(function(){		
	},2500);
}






function goToStackBottom()
{
	if(!animate)
	{
		return;
	}
	taskManager.push(function(){		
	    elementBasedWindowScroll($(columns[5]),'top',-5);
	},0);
	taskManager.push(function(){		
	    smoothScrollElement(stackSVGContainer[0],0,0);
	},200);
}



function goToStackTop()
{
	if(!animate)
	{
		return;
	}
	taskManager.push(function(){		
	    elementBasedWindowScroll($(columns[5]),'top',-5);
	},0);
	taskManager.push(function(){		
	    var x=stackShape.getBBox().x;
		animatedStack.forEach(function(item){
			x+=item.rect.getBBox().width;
		});		
		smoothScrollElement(stackSVGContainer[0],0,x-60);
	},200);
	taskManager.push(function(){		
	},2000);	
}



function animatedTokenRead(text)
{	
	if(!animate)
	{
		return;
	}
	dropTokenText();	
	createTokenText(text);
}




function animatedTableCheck(tableTerminal,tableNonTerminal)
{
	if(!animate)
	{
		return;
	}
	goToFFTableCell(tableTerminal,tableNonTerminal);
}





function pushAnimatedStack(tokenStr)
{	
	if(!animate)
	{
		return;
	}
	taskManager.push(function(){			
			var token=document.createElementNS("http://www.w3.org/2000/svg","path");
			stackSVG[0].appendChild(token);

			var stackHeight=stackShape.getBBox().height;

			var textTop=100;
			var textLeft=15000;

			var text;	
			text=document.createElementNS("http://www.w3.org/2000/svg","text");
			text.setAttribute("fill","rgb(70,70,70)");  ;
		    text.setAttribute("font-size","20");
		    text.setAttribute("font-family","jannat");
		    text.setAttribute("dy","3");
		    text.setAttribute("y",textTop);
		    text.setAttribute("x",textLeft);
		    text.setAttribute("text-anchor","middle");
		    text.setAttribute("alignment-baseline","right");
		    text.innerHTML=tokenStr;
		    stackSVG[0].appendChild(text);

		    
		    var textWidth=text.getBBox().width;
		    var textHeight=text.getBBox().height;
		 	var paddingSides=20;
		    var paddingTop=stackHeight-textHeight;
		    textWidth+=paddingSides;
		    textHeight+=paddingTop-8;

			token.setAttribute("d","m "+textLeft+" "+textTop+" l "+(textWidth/2)+" 0 l 0 "+(textHeight)+" l -"+(textWidth)+" 0 l 0 -"+(textHeight)+" l "+(textWidth/2)+" 0");
			token.setAttribute("stroke","rgb(120,120,120)");
			token.setAttribute("fill","rgb(160,185,160)");
			token.setAttribute("stroke-width","2");
			token.setAttribute("transform","translate(0,-"+(textHeight/2)+")");

			var newTextLeft=100;
			animatedStack.forEach(function(item){
				newTextLeft+=item.rect.getBBox().width;
			});
			newTextLeft+=textWidth/2+2;

			setTimeout(function(){			
				text.setAttribute("transform","translate(-"+(textLeft-newTextLeft)+",0)");
				token.setAttribute("d","m "+newTextLeft+" "+textTop+" l "+(textWidth/2)+" 0 l 0 "+(textHeight)+" l -"+(textWidth)+" 0 l 0 -"+(textHeight)+" l "+(textWidth/2)+" 0");
			},200*(animationRatio/100));

			animatedStack.push({rect:token,text:text});
	},200);
	taskManager.push(function(){		
	},1200);
}


function popAnimatedStack()
{
	if(!animate)
	{
		return;
	}
	taskManager.push(function(){	
			if(!animatedStack.length)
			{
				//console.error('Animated Stack OverPopping!');
				return;
			}		
			var token=animatedStack[animatedStack.length-1];
			var text=token.text;
			var rect=token.rect;

			text.style.opacity='0';
			rect.style.opacity='0';

			setTimeout(function(){
				stackSVG[0].removeChild(rect);
				stackSVG[0].removeChild(text);				
			},1400*(animationRatio/100));

			animatedStack.pop();
	},200);
}







function firstFollowButton()
{
	setGrammarObject(grammarTextArea[0].value.trim());
	setFirstFollow();
	logFirstFollow();
}
mainButtons[3].onclick=function(){
	firstFollowButton();
};

function drawTableButton()
{
	setGrammarObject(grammarTextArea[0].value.trim());
	setFirstFollow();
	createTable();
	logTable();
}
mainButtons[4].onclick=function(){
	drawTableButton();
};


function stopAnimation()
{
	taskManager.pause();
	taskManager.reset();	
	animationControl[0].style.bottom='-400px';
	goToLogBottom();
	animate=false;

	body[0].style.overflow='auto';	
	mainButtons.forEach(function(button){
		button.disabled=false;
	});
	grammarTextArea[0].disabled=false;
	codeTextArea[0].disabled=false;
}
animationControlButtons[1].onclick=function(){
	stopAnimation();
};

function pauseAnimation()
{
	taskManager.pause();	
	body[0].style.overflow='auto';
	optionButtonImg[1].src='./icons/play.png';
	animationPaused=true;

}
function resumeAnimation()
{
	taskManager.handler();	
	body[0].style.overflow='hidden';
	optionButtonImg[1].src='./icons/pause.png';
	animationPaused=false;
}


function handleAnimationPause()
{
	if(animationPaused)
	{
		resumeAnimation();
	}else{
		pauseAnimation();
	}
}
animationControlButtons[2].onclick=function(){
	handleAnimationPause();
};

function resetAnimationSVG()
{
	body[0].style.overflow='hidden';
	mainButtons.forEach(function(button){
		button.disabled=true;
	});
	grammarTextArea[0].disabled=true;
	codeTextArea[0].disabled=true;

	try{
		stackSVG[0].removeChild(stackShape);
		stackSVG[0].removeChild(currentTokenTitle);
	}catch(e){}

	currentTokenLetters.forEach(function(letter){
		stackSVG[0].removeChild(letter);
	});
	animatedStack.forEach(function(item){
		stackSVG[0].removeChild(item.rect);
		stackSVG[0].removeChild(item.text);
	});
	animatedStack=[];
	currentTokenLetters=[];
	optionButtonImg[1].src='./icons/pause.png';
	animationTraceSpan[0].style.width='0';
	animationPaused=false;
	setAnimationDuration();
	updatePlayedBar();

	animationControl[0].style.bottom='0';
}



function setAnimationDuration()
{
	animationDuration=0;
	taskManager.stack.forEach(function(task){
		animationDuration+=task.wait;
	});
}

function updatePlayedBar()
{
	var remaining=0;
	taskManager.stack.forEach(function(task){
		remaining+=task.wait;
	});
	animationTraceSpan[0].style.width=((animationDuration-remaining)/animationDuration*100)+'%';
}


function animatedParseButton()
{			
	setGrammarObject(grammarTextArea[0].value.trim());
	setFirstFollow();
	createTable();
	parseAnimation();
	parse(true);	
	createSymbolTable();
	logSymbolTable();
	resetAnimationSVG();
}
mainButtons[1].onclick=function(){
	animatedParseButton();
};


function realTimeParseButton()
{
	setGrammarObject(grammarTextArea[0].value.trim());
	setFirstFollow();
	logFirstFollow();
	createTable();
	logTable();
	parse(false);
	createSymbolTable();
	logSymbolTable();
}
mainButtons[0].onclick=function(){
	realTimeParseButton();
};



function getPosition()
{
	var pointerTmp=pointer;
	var thisLine;
	for(var i=0;codeLines.length;i++)
	{
		thisLineLength=codeLines[i].length+1;
		if((pointerTmp-(thisLineLength))<=0)
		{
			break;
		}
		pointerTmp-=thisLineLength;
	}
	return {line:i+1,char:pointerTmp+1};
}





