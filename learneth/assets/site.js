"use strict";
const form = document.querySelector("#sample-form");
const answer = document.querySelector("#sample-answer");
const response = document.querySelector("#response");
const reset = document.querySelector("#reset");
form.addEventListener("submit", event => {
  event.preventDefault();
  const text = answer.value.trim();
  if (!text) { answer.focus(); return; }
  const quote = document.createElement("blockquote");
  quote.className = "learner";
  const speaker = document.createElement("span");
  speaker.className = "speaker";
  speaker.textContent = "YOU · PREVIEW RESPONSE";
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  quote.append(speaker, paragraph);
  const feedback = document.createElement("div");
  feedback.className = "feedback";
  const label = document.createElement("span");
  label.className = "feedback-label";
  label.textContent = "↳ A SCRIPTED TEACHING NOTE · NOT A GRADE";
  const heading = document.createElement("h4");
  heading.textContent = "Look at what changes—not just the speedometer.";
  const explanation = document.createElement("p");
  explanation.textContent = "On a circular track, the car’s direction keeps changing. Its velocity changes even at constant speed, so it is accelerating. A live Learneth session would respond to your particular reasoning; this preview adds the same example note for everyone.";
  feedback.append(label, heading, explanation);
  response.replaceChildren(quote, feedback);
  form.hidden = true;
  reset.hidden = false;
  reset.focus({preventScroll:true});
  response.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block:"nearest"});
});
reset.addEventListener("click", () => {
  response.replaceChildren();
  form.hidden = false;
  reset.hidden = true;
  answer.value = "";
  answer.focus();
});

// Decorative word changes never interrupt screen readers or reduced-motion users.
(()=>{const word=document.querySelector('.rotating-word');if(!word)return;const motion=matchMedia('(prefers-reduced-motion: reduce)');const words=['textbooks','documents','notes','learning'];let index=0;setInterval(()=>{if(motion.matches||document.hidden)return;word.classList.add('switching');setTimeout(()=>{word.textContent=words[index=(index+1)%words.length];word.classList.remove('switching')},220)},2600)})();
