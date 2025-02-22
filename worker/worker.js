addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

const errorAsHTML = (inner) => {
  return `
    <!DOCTYPE html>
    <html>
      <body>
      ${inner}
      </body>
    </html>
  `
}

/**
 * Fetch and log a request
 * @param {Request} request
 */
async function handleRequest(request) {
  let url = get("url", request.url);
  if (url) {
    const { get_ld_json } = wasm_bindgen;
    await wasm_bindgen(wasm);
    let data;
    if (request.method === "POST") {
      data = await (await request.formData()).get("html");
      console.log("Got form data!", data)
    }
    if (!data) {
      data = await fetch(url).then((r) => r.text());
      if (data.includes("Please Wait... | Cloudflare")) {
        return new Response(errorAsHTML(`<p>This site blocks scrapers. :(</p>`), {
          status: 400,
          headers: { "Content-Type": "text/html" }
        })
      }
    }
    let recipe_context;
    try {
      recipe_context = `${get_ld_json(data)}(${url})`;
    } catch (error) {
      return new Response(errorAsHTML(`<p>"Whoops! Something went wrong"</p>`), {
        status: 400,
        headers: { "Content-Type": "text/html" }
      })
    }

    if (recipe_context.includes("Whoops! Something went wrong")) {
      return new Response(errorAsHTML(recipe_context), {
        status: 400,
        headers: { "Content-Type": "text/html" }
      })
    }

    let res = new Response(recipe_context, {
      status: 200,
      headers: { "Content-Type": "text/markdown" },
    });
    return res;
  }
  return Response.redirect("https://recipes-ssg.netlify.app/", 301)
}

function get(name, url) {
  if (
    (name = new RegExp("[?&]" + encodeURIComponent(name) + "=([^&]*)").exec(
      url
    ))
  )
    return decodeURIComponent(name[1]);
}
