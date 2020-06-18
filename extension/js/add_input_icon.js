/* global browser */
/* global fillInputWithAlias */


function closeRelayInPageMenu() {
  const relayIconBtn = document.querySelector(".relay-button");
  relayIconBtn.classList.remove("relay-menu-open");
  const openMenuEl = document.querySelector(".new-menu-wrapper");
  openMenuEl.remove();
  restrictOrRestorePageTabbing(0);
  document.removeEventListener("keydown", handleKeydownEvents);
  window.removeEventListener("resize", positionRelayMenu);
  window.removeEventListener("scroll", positionRelayMenu);
  return;
}


function addRelayMenuToPage(relayMenuWrapper, relayInPageMenu, relayIconBtn) {
  relayMenuWrapper.appendChild(relayInPageMenu);
  document.body.appendChild(relayMenuWrapper);

  // Position menu according to the input icon's position
  positionRelayMenu();
  relayIconBtn.focus();
  return;
}


function preventDefaultBehavior(clickEvt) {
  clickEvt.stopPropagation();
  clickEvt.stopImmediatePropagation();
  clickEvt.preventDefault();
  return;
}


function getRelayMenuEl() {
  return document.querySelector(".relay-menu");
}


function positionRelayMenu() {
  const relayInPageMenu = getRelayMenuEl();
  const relayIconBtn = document.querySelector(".relay-button");
  const newIconPosition = relayIconBtn.getBoundingClientRect();
  relayInPageMenu.style.left = (newIconPosition.x - 255) + "px";
  relayInPageMenu.style.top = (newIconPosition.top + 40) + "px";
}


let activeElemIndex = -1;
function handleKeydownEvents(e) {
  const relayInPageMenu = getRelayMenuEl();
  const clickableElsInMenu = relayInPageMenu.querySelectorAll("button, a");
  const relayButton = document.querySelector(".relay-button");
  const watchedKeys = ["Escape", "ArrowDown", "ArrowUp", "Tab"];
  const watchedKeyClicked = watchedKeys.includes(e.key);

  if (e.key === "Escape") {
    preventDefaultBehavior(e);
    return closeRelayInPageMenu();
  }

  if (e.key === "ArrowDown" || (e.key === "Tab" && e.shiftKey === false)) {
    preventDefaultBehavior(e);
    activeElemIndex += 1;
  }

  if (e.key === "ArrowUp"|| (e.key === "Tab" && e.shiftKey === true)) {
    preventDefaultBehavior(e);
    activeElemIndex -= 1;
  }

  if ((clickableElsInMenu[activeElemIndex] !== undefined) && watchedKeyClicked) {
    return clickableElsInMenu[activeElemIndex].focus();
  }

  if (watchedKeyClicked) {
    activeElemIndex = -1;
    relayButton.focus();
  }
}


// When restricting tabbing to Relay menu... tabIndexValue = -1
// When restoring tabbing to page elements... tabIndexValue = 0
function restrictOrRestorePageTabbing(tabIndexValue) {
  const allClickableEls = document.querySelectorAll("button, a, input, select, option, textarea, [tabindex]");
  allClickableEls.forEach(el => {
    el.tabIndex = tabIndexValue;
  });
}

function createElementWithClassList(elemType, elemClass) {
  const newElem = document.createElement(elemType);
  newElem.classList.add(elemClass);
  return newElem;
}


async function isUserSignedIn() {
  const userApiToken = await browser.storage.local.get("apiToken");
  return (userApiToken.hasOwnProperty("apiToken"));
}


async function addRelayIconToInput(emailInput) {
  const { relaySiteOrigin } = await browser.storage.local.get("relaySiteOrigin");
  // remember the input's original parent element;
  const emailInputOriginalParentEl = emailInput.parentElement;

  // create new wrapping element;
  const emailInputWrapper = createElementWithClassList("div", "relay-email-input-wrapper");
  emailInputOriginalParentEl.insertBefore(emailInputWrapper, emailInput);

  // add padding to the input so that input text
  // is not covered up by the Relay icon
  emailInput.style.paddingRight = "50px";
  emailInputWrapper.appendChild(emailInput);

  const computedInputStyles = getComputedStyle(emailInput);
  const inputHeight = emailInput.offsetHeight;

  const divEl = createElementWithClassList("div", "relay-icon");
  divEl.style.height = computedInputStyles.height;
  divEl.style.top = computedInputStyles.marginTop;
  divEl.style.bottom = computedInputStyles.marginBottom;


  const relayIconBtn = createElementWithClassList("button", "relay-button");
  relayIconBtn.id = "relay-button";
  relayIconBtn.type = "button";
  relayIconBtn.title = "Generate relay address";

  const relayIconHeight = 30;
  if (relayIconHeight > inputHeight) {
    const smallIconSize = "24px";
    relayIconBtn.style.height = smallIconSize;
    relayIconBtn.style.width = smallIconSize;
    relayIconBtn.style.minWidth = smallIconSize;
    emailInput.style.paddingRight = "30px";
    divEl.style.right = "2px";
  }


  relayIconBtn.addEventListener("click", async(e) => {

    preventDefaultBehavior(e);
    window.addEventListener("resize", positionRelayMenu);
    window.addEventListener("scroll", positionRelayMenu);
    document.addEventListener("keydown", handleKeydownEvents);

    const relayInPageMenu = createElementWithClassList("div", "relay-menu");
    const relayMenuWrapper = createElementWithClassList("div", "new-menu-wrapper");

    // Close menu if the user clicks outside of the menu
    relayMenuWrapper.addEventListener("click", closeRelayInPageMenu);

    // Close menu if it's already open
    relayIconBtn.classList.toggle("relay-menu-open");
    if (!relayIconBtn.classList.contains("relay-menu-open")) {
      return closeRelayInPageMenu();
    }

    const signedInUser = await isUserSignedIn();

    if (!signedInUser) {
      const signUpMessageEl = createElementWithClassList("span", "relay-menu-sign-up-message");
      signUpMessageEl.textContent = "Visit the Firefox Relay website to sign in, create an account, or join the beta waitlist.";

      relayInPageMenu.appendChild(signUpMessageEl);
      const signUpButton = createElementWithClassList("button", "relay-menu-sign-up-btn");
      signUpButton.textContent = "Go to Firefox Relay";

      signUpButton.addEventListener("click", async(clickEvt) => {
        preventDefaultBehavior(clickEvt);
        await browser.runtime.sendMessage({
          method: "openRelayHomepage",
        });
        closeRelayInPageMenu();
      });
      relayInPageMenu.appendChild(signUpButton);

      addRelayMenuToPage(relayMenuWrapper, relayInPageMenu, relayIconBtn);
      return;
    }

    // Create "Generate Relay Address" button
    const generateAliasBtn = createElementWithClassList("button", "in-page-menu-generate-alias-btn");
    generateAliasBtn.textContent = "Generate Relay Address";


    // Create "You have .../.. remaining relay address" message
    const remainingAliasesSpan = createElementWithClassList("span", "in-page-menu-remaining-aliases");
    const { relayAddresses } = await browser.storage.local.get("relayAddresses");
    const { maxNumAliases } = await browser.storage.local.get("maxNumAliases");

    const numAliasesRemaining = maxNumAliases - relayAddresses.length;
    const addresses = (numAliasesRemaining === 1) ? "address" : "addresses";
    remainingAliasesSpan.textContent = `You have ${numAliasesRemaining} remaining relay ${addresses}`;

    const maxNumAliasesReached = numAliasesRemaining === 0;
    if (maxNumAliasesReached) {
      generateAliasBtn.disabled = true;
    }

    // Create "Manage Relay Addresses" link
    const relayMenuDashboardLink = createElementWithClassList("a", "in-page-menu-dashboard-link");
    relayMenuDashboardLink.textContent = "Manage Relay Addresses";
    relayMenuDashboardLink.href = relaySiteOrigin;
    relayMenuDashboardLink.target = "_blank";
    // relayInPageMenu.appendChild(generateAliasBtn);


    // Restrict tabbing to relay menu elements
    restrictOrRestorePageTabbing(-1);

    // Append menu elements to the menu
    [generateAliasBtn, remainingAliasesSpan, relayMenuDashboardLink].forEach(el => {
      relayInPageMenu.appendChild(el);
    });

    // Handle "Generate Relay Address" clicks
    generateAliasBtn.addEventListener("click", async(generateClickEvt) => {
      preventDefaultBehavior(generateClickEvt);

      // Attempt to create a new alias
      const newRelayAddressResponse = await browser.runtime.sendMessage({
        method: "makeRelayAddress",
        domain: document.location.hostname,
      });

      relayInPageMenu.classList.add("alias-loading");

      // Catch edge cases where the "Generate Relay Address" button is still enabled,
      // but the user has already reached the max number of aliases.
      if (newRelayAddressResponse.status === 402) {
        relayInPageMenu.classList.remove("alias-loading");
        // preserve menu height before removing child elements
        relayInPageMenu.style.height = relayInPageMenu.clientHeight + "px";

        [generateAliasBtn, remainingAliasesSpan].forEach(el => {
          el.remove();
        });

        const errorMessage = createElementWithClassList("p", "relay-error-message");
        errorMessage.textContent = `You have already created ${maxNumAliases} relay addresses`;
        relayInPageMenu.insertBefore(errorMessage, relayMenuDashboardLink);
        return;
      }

      setTimeout(() => {
        fillInputWithAlias(emailInput, newRelayAddressResponse);
        relayIconBtn.classList.add("user-generated-relay");
        closeRelayInPageMenu();
      }, 700);
    });

    addRelayMenuToPage(relayMenuWrapper, relayInPageMenu, relayIconBtn);
  });

  divEl.appendChild(relayIconBtn);
  emailInputWrapper.appendChild(divEl);
}

function getEmailInputsAndAddIcon() {
  const getEmailInputs = document.querySelectorAll("input[type='email']");
  for (const emailInput of getEmailInputs) {
    if (!emailInput.parentElement.classList.contains("relay-email-input-wrapper")) {
      addRelayIconToInput(emailInput);
    }
  }
}

(async function() {
  const inputIconPref = await browser.storage.local.get("showInputIcons");
  if (inputIconPref.showInputIcons !== "show-input-icons") {
    return;
  }
  // Catch all immediately findable email inputs
  getEmailInputsAndAddIcon();

  // Catch email inputs that only become findable after
  // the entire page (including JS/CSS/images/etc) is fully loaded.
  window.addEventListener("load", () => {
    getEmailInputsAndAddIcon();
  });

  // Create a MutationObserver to watch for dynamically generated email inputs
  const mutationObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.target.tagName === "FORM") {
        const emailInput = mutation.target.querySelector("input[type='email']");
        if (emailInput && !emailInput.parentElement.classList.contains("relay-email-input-wrapper")) {
          addRelayIconToInput(emailInput);
        }
      }
    });
  });

  mutationObserver.observe(document.body, { childList: true, subtree: true });
})();
