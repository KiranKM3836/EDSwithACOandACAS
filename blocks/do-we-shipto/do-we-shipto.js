export default function decorate(block) {

    // Create form
    const form = document.createElement("form");
    form.id = "zipForm";

    const label = document.createElement("label");
    label.for = "zipcode";
    label.textContent = "Enter ZIP Code: ";
    form.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.id = "zipcode";
    input.name = "zipcode";
    input.placeholder = "Enter Zipcode here...";
    input.required = true;
    form.appendChild(input);

    const button = document.createElement("button");
    button.type = "submit";
    button.textContent = "Search";
    form.appendChild(button);

    const message = document.createElement("p");
    message.id = "message";
    form.appendChild(message);

    // Zipcode validaion 
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const zipcode = input.value.trim();
        const apiUrl = `https://3676633-266fuchsiaeagle-stage.adobeioruntime.net/api/v1/web/app-builder/validate-zip?zipcode=${zipcode}`; // Appbuilder API

        message.textContent = "Validating...";
        message.style.color = "black";

        try {
            const response = await fetch(apiUrl);
            const result = await response.json();

            if (result.valid === true) {
                message.textContent = "We do ship to your Zip Code!!!";
                message.style.color = "green";
            } else {
                message.textContent = "We currently don't serve your Zip Code.";
                message.style.color = "red";
            }
        } catch (error) {
            console.error("API call failed:", error);
            message.textContent = "Error validating ZIPcode.";
            message.style.color = "red";
        }
         
        
    });

    // Append form to body
    block.appendChild(form);
}