const codeBlockRegex = /```[\s\S]*?```/gs;
const headingRegex = [
  /^#\s(.+)/gm,
  /^##\s(.+)/gm,
  /^###\s(.+)/gm,
  /^####\s(.+)/gm
];

function extractCodeBlocks(response) {
  const codeBlocks = response.match(codeBlockRegex);
  if (codeBlocks) {
    response = codeBlocks.reduce((acc, codeBlock) => {
      const codeWithoutMarkdown = codeBlock.replace(/```/g, '');
      return acc.replace(codeBlock, '```' + codeWithoutMarkdown + '```');
    }, response);
  }

  return response;
}

function createCodeBlockUI(codeBlock) {
  const preElement = document.createElement('pre');
  preElement.textContent = codeBlock.replace(/```/g, '');

  const codeBlockElement = document.createElement('div');
  codeBlockElement.classList.add('code-block');
  codeBlockElement.appendChild(preElement);

  const copyCodeButton = document.createElement('button');
  copyCodeButton.classList.add('copy-code-button');
  copyCodeButton.textContent = 'Copy The Code';
  codeBlockElement.appendChild(copyCodeButton);

  return codeBlockElement.outerHTML;
}

function parseResponse(response) {
  let parsedResponse = response;

  const codeBlocks = parsedResponse.match(codeBlockRegex);

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(codeBlock, `CODEBLOCK${index}`);
    }, parsedResponse);
  }

  parsedResponse = parsedResponse.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  parsedResponse = parsedResponse.replace(/\$\$(.*?)\$\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parsedResponse.replace(/\$(.*?)\$/g, '<span class="mathjax-latex">\\($1\\)</span>');
  parsedResponse = parseTables(parsedResponse);

  headingRegex.forEach((regex, index) => {
    const fontSize = 30 - (index * 4);
    const fontWeight = index === 0 ? 'bold' : 'normal';
    parsedResponse = parsedResponse.replace(regex, `<span style="font-size: ${fontSize}px; font-weight: ${fontWeight};">$1</span>`);
  });

  parsedResponse = parsedResponse.replace(/>\s(.*?)$/gm, '<div class="blockquote">$1</div>');
  parsedResponse = parsedResponse.replace(/\*(.*?)\*/g, '<i>$1</i>');

  if (codeBlocks) {
    parsedResponse = codeBlocks.reduce((acc, codeBlock, index) => {
      return acc.replace(`CODEBLOCK${index}`, createCodeBlockUI(codeBlock));
    }, parsedResponse);
  }

  return parsedResponse;
}

function parseTables(response) {
  const tableRegex = /\n((?:\s*:?[\|:].*?:?\|\n)+)\n/g;
  return response.replace(tableRegex, createTable);
}

function createTable(match, table) {
  const rows = table.trim().split('\n');
  const tableElement = document.createElement('table');

  const tableHeader = document.createElement('tr');
  const tableHeaderCells = rows[0].split('|').slice(1, -1);
  tableHeaderCells.forEach((cell) => {
    const th = document.createElement('th');
    th.classList.add('table-header');
    th.textContent = cell.trim();
    tableHeader.appendChild(th);
  });
  tableElement.appendChild(tableHeader);

  for (let i = 2; i < rows.length; i++) {
    const row = document.createElement('tr');
    const tableCells = rows[i].split('|').slice(1, -1);
    tableCells.forEach((cell) => {
      const td = document.createElement('td');
      td.classList.add('table-data');
      td.innerHTML = parseResponse(cell.trim());
      row.appendChild(td);
    });
    tableElement.appendChild(row);
  }

  return `\n${tableElement.outerHTML}\n`;
}
