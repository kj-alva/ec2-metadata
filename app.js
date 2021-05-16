const AWS = require('aws-sdk');
const Logger = require('js-logger');
const metadataRoot = "/latest/meta-data";
let rootNode = {}

const fetch = require('node-fetch');
// Some issue with request method callback function. As a workaround I have used URL to obtain metadata
//var metadataClient  = new AWS.MetadataService({httpOptions: {timeout: 5000}});

let count = 0;
let tmpString = ""

async function returnMetadata(metadataElement){
    Logger.info("Starting return metadata function.");
    count++;
    Logger.debug("Metadata element path passed to the function:::::", metadataElement);
    let tmpNode = {};
    if(metadataElement && metadataElement.length > 0 ){
        
        // Using node-fetch get the values returned by the metadata endpoint
        const metadataRows = await getMetadataValue(metadataElement);
        Logger.debug("Metadata returned from the ec2 metadata client:::::", metadataRows);
        let metadataArray = [];
        metadataArray = metadataRows.toString().split("\n");
        // Condition to check if the path passed has subelements. If not return the value without using recurssive functionality
        if(metadataArray.length == 1){
            let inputPath = process.argv.slice(2);
            tmpNode[inputPath.toString.replace('/','')] = JSON.stringify(metadataArray[0]);
            return tmpNode
        }
        for( const line of metadataRows.toString().split("\n") ){
            // Condition to check if the path ends with forward slash indicating subelements
            // If no subelements then get the metadata value for the element
            if(!line.endsWith('/')){  
                Logger.debug("Within element that has a single subelement:::::", line);     
                const elementValue = await getMetadataValue(metadataElement+'/'+line);
                tmpNode[line] = elementValue
            } else {
                if(line){
                    Logger.debug("Within element that has multiple subelements:::::", line); 
                    const returnedNode = {}
                    // If subelements found invoke the method again which would iterate over the elements
                    // and store their values.
                    returnedNode[line.replace('/','')] = await returnMetadata(metadataElement+line)
                    tmpNode = Object.assign(tmpNode,returnedNode);
                }
            }
        }
    } else {
        Logger.error("No metadata element passed. Please pass a metadata path")
    }

    return tmpNode;
}

async function getMetadataValue(metadataPath){
    let metadataValues = [];
    try{
        // Some issue with request method callback function. As a workaround I have used URL to obtain metadata
        //return metadataClient.request(metadataPath,(err,data) =>{});
        Logger.debug("Get metadata element values for path:::::", metadataPath);
        //const metadataValues =  await fetch(`http://localhost:1338${metadataPath}`).then(res => res.text());
        metadataValues =  await fetch(`http://169.254.169.254${metadataPath}`).then(res => res.text());
    //console.log("console valuess---",metadataValues);
    } catch (error) {
        Logger.error(`Error occurred while obtaining data for path ${metadataPath}`, error)
    }
    return metadataValues;
}

async function invoke(){
    let finalValue = await returnMetadata(`${metadataRoot}/${process.argv.slice(2)}`)
    console.log("Metadata queried from instance:::::", finalValue);
    return finalValue;
}

invoke();