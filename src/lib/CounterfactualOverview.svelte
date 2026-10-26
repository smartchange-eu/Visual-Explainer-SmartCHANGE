<div class="panel flex-1 min-h-0 flex flex-col">
    <div class="panelHeader flex-initial">Counterfactual Summary</div>
    <div class="panelBody flex-1 flex flex-col min-h-0">
        <AgeControl/>
        <CounterfactualList/>
    </div>
</div>

<script>
	import CounterfactualList from './components/counterfactuals/CounterfactualList.svelte';
    import AgeControl from './components/counterfactuals/AgeControl.svelte';
</script>


