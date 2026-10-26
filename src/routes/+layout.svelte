<div id="maincontent" class="flex flex-col">
  <header>
      <span class="pl-4">Visual Explainer</span>
      <img src={logo} class="h-[3rem]"/>
  </header>

  <main class="p-1 flex w-full flex-1 min-h-0">
      <slot /> <!-- 👈 Renders the current page here -->
  </main>
</div>

<script>
    import logo from '$lib/images/smartchange_logo.png'
    import './styles.css';
</script>

<style lang="less">
    header {
      top: 0;
      left: 0;
      right: 0;
      background-color: #3C3A8A;
      color: white;
      padding: 0.5rem;
      font-size: 1.8rem;
      font-weight: bold;
      z-index: 1000;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family:  Helvetica, Arial, sans-serif;
    }

</style>