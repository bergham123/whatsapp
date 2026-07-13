// ===============================
// Elements
// ===============================

const accountsArea = document.getElementById("accounts");
const messagesArea = document.getElementById("messages");

const loadAccountsBtn = document.getElementById("loadAccounts");
const loadMessagesBtn = document.getElementById("loadMessages");

const clearAccountsBtn = document.getElementById("clearAccounts");
const clearMessagesBtn = document.getElementById("clearMessages");

const saveAllBtn = document.getElementById("saveAll");
const runWorkflowBtn = document.getElementById("runWorkflow");

const logs = document.getElementById("logs");
const status = document.getElementById("status");


// ===============================
// Helpers
// ===============================

function log(text) {

    const time = new Date().toLocaleTimeString();

    logs.innerHTML += `<div>[${time}] ${text}</div>`;

    logs.scrollTop = logs.scrollHeight;

}

function setStatus(text) {

    status.textContent = text;

}



// ===============================
// Convert Text => JSON Array
// ===============================

function textToArray(text) {

    return [...new Set(

        text
            .split("\n")
            .map(x => x.trim())
            .filter(x => x !== "")

    )];

}



// ===============================
// Clear
// ===============================

clearAccountsBtn.onclick = () => {

    accountsArea.value = "";

    log("Accounts cleared");

};


clearMessagesBtn.onclick = () => {

    messagesArea.value = "";

    log("Messages cleared");

};



// ===============================
// Load Accounts
// ===============================

loadAccountsBtn.onclick = async () => {

    try{

        setStatus("Loading Accounts...");

        const res = await fetch("/.netlify/functions/load-accounts");

        const data = await res.json();

        accountsArea.value = data.join("\n");

        log("Accounts loaded");

        setStatus("Ready");

    }

    catch(e){

        log("Cannot load accounts");

        console.error(e);

    }

};



// ===============================
// Load Messages
// ===============================

loadMessagesBtn.onclick = async ()=>{

    try{

        setStatus("Loading Messages...");

        const res = await fetch("/.netlify/functions/load-messages");

        const data = await res.json();

        messagesArea.value = data.join("\n");

        log("Messages loaded");

        setStatus("Ready");

    }

    catch(e){

        log("Cannot load messages");

    }

};




// ===============================
// Save All
// ===============================

saveAllBtn.onclick = async ()=>{

    const accounts = textToArray(accountsArea.value);

    const messages = textToArray(messagesArea.value);

    if(accounts.length===0){

        alert("Accounts Empty");

        return;

    }

    if(messages.length===0){

        alert("Messages Empty");

        return;

    }

    saveAllBtn.disabled = true;

    setStatus("Saving...");

    log("Uploading data...");

    try{

        const res = await fetch("/.netlify/functions/save-all",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                accounts,

                messages

            })

        });

        const data = await res.json();

        if(data.success){

            log("Accounts saved");

            log("Messages saved");

            log("GitHub Commit Created");

            setStatus("Saved Successfully");

            runWorkflowBtn.disabled = false;

        }

        else{

            log(data.error);

            alert(data.error);

        }

    }

    catch(err){

        console.error(err);

        log("Server Error");

    }

    saveAllBtn.disabled = false;

};




// ===============================
// Run Workflow
// ===============================

runWorkflowBtn.onclick = async ()=>{

    runWorkflowBtn.disabled = true;

    setStatus("Starting Workflow...");

    log("Sending request...");

    try{

        const res = await fetch("/.netlify/functions/run-workflow",{

            method:"POST"

        });

        const data = await res.json();

        if(data.success){

            log("Workflow Started");

            setStatus("Workflow Running");

        }

        else{

            log(data.error);

        }

    }

    catch(e){

        console.error(e);

        log("Workflow Error");

    }

};




// ===============================
// Logout
// ===============================

document.getElementById("logout").onclick=()=>{

    localStorage.removeItem("token");

    location.href="login.html";

};




// ===============================
// Check Login
// ===============================

const token = localStorage.getItem("token");

if(!token){

    location.href="login.html";

}




// ===============================
// Welcome
// ===============================

log("Dashboard Ready");
