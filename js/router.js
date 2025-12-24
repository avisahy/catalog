function router() {
    const hash = location.hash || "#home";

    if (hash === "#home") return renderHome();

    if (hash.startsWith("#item/")) {
        const id = hash.split("/")[1];
        return renderItem(id);
    }

    if (hash === "#add") return renderForm("add");

    if (hash.startsWith("#edit/")) {
        const id = hash.split("/")[1];
        return renderForm("edit", id);
    }
}

window.addEventListener("hashchange", router);
